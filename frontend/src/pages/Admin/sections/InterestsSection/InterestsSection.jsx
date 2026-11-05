import { useState, useEffect } from 'react'
import {
  getInterests, createInterest, updateInterest, deleteInterest, uploadMultiple,
  pruneUnusedImages, storageUrlsIn,
} from '../../../../firebase'
import { useToast } from '../../../../context/ToastContext'
import Modal from '../../../../components/Modal'
import Button from '../../../../components/Button'
import { Plus, Close } from '../../../../components/Icons'
import { SectionHeader, EmptyState, SkeletonRows, DropZone, Pill, IconAction, cx } from '../../ui'
import { IconPencil, IconTrash, IconStar, IconEye, IconEyeOff, IconImage, IconChevLeft, IconChevRight } from '../../icons'
import styles from '../../Admin.module.css'

const BLANK = {
  name: '', description: '', coverImage: '', images: [], order: 99, hidden: false,
}

const slug = (s) => (s || 'untitled').toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled'

// Lighter than Projects: hobbies, not portfolio pieces. Zero images is fine, the site shows a "coming soon" tile.
export default function InterestsSection() {
  const { addToast } = useToast()
  const [interests, setInterests] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // { mode, id? }
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const load = () => getInterests().then(setInterests).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const set = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  function openNew() {
    setForm({ ...BLANK, order: interests.length + 1 })
    setModal({ mode: 'add' })
  }
  function openEdit(i) {
    setForm({ ...BLANK, ...i, images: Array.isArray(i.images) ? i.images : [] })
    setModal({ mode: 'edit', id: i.id })
  }
  const close = () => setModal(null)

  async function handleImagesUpload(e) {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    try {
      const urls = await uploadMultiple(files, `portfolio/interests/${slug(form.name)}`)
      setForm(f => ({
        ...f,
        images: [...f.images, ...urls],
        // The first upload on an empty interest becomes the cover, so it never lacks a thumbnail.
        coverImage: f.coverImage || urls[0],
      }))
    } catch { addToast({ type: 'error', title: 'Image upload failed' }) }
    finally { setUploading(false) }
  }

  const removeImage = (i) =>
    setForm(f => {
      const removed = f.images[i]
      const images = f.images.filter((_, idx) => idx !== i)
      return { ...f, images, coverImage: f.coverImage === removed ? (images[0] ?? '') : f.coverImage }
    })

  const moveImage = (i, delta) => setForm(f => {
    const j = i + delta
    if (j < 0 || j >= f.images.length) return f
    const next = [...f.images]
    ;[next[i], next[j]] = [next[j], next[i]]
    return { ...f, images: next }
  })

  const makeCover = (url) => setForm(f => ({ ...f, coverImage: url }))

  async function save(e) {
    e.preventDefault()
    if (!form.name.trim()) { addToast({ type: 'error', title: 'Name is required' }); return }
    setSaving(true)
    // Dropped images are deleted after the save, so Cancel leaves them alone.
    const previous = modal.mode === 'edit'
      ? storageUrlsIn(interests.find(i => i.id === modal.id) || {})
      : []
    try {
      const { id, ...rest } = form
      const data = {
        ...rest,
        order: Number(form.order) || 0,
        images: form.images.filter(Boolean),
      }
      if (modal.mode === 'add') await createInterest(data)
      else await updateInterest(modal.id, data)
      addToast({ type: 'success', title: modal.mode === 'add' ? 'Interest created' : 'Interest updated' })
      close()
      load()
      await pruneUnusedImages(previous)
    } catch (err) {
      addToast({ type: 'error', title: 'Save failed', message: err?.message })
    } finally { setSaving(false) }
  }

  async function remove(i) {
    if (!window.confirm(`Delete "${i.name}"? This cannot be undone.`)) return
    const previous = storageUrlsIn(i)
    await deleteInterest(i.id)
    setInterests(is => is.filter(x => x.id !== i.id))
    addToast({ type: 'success', title: 'Interest deleted' })
    await pruneUnusedImages(previous)
  }

  async function saveOrder(i, order) {
    const n = Number(order)
    if (Number.isNaN(n)) return
    await updateInterest(i.id, { order: n })
    setInterests(prev => [...prev.map(x => x.id === i.id ? { ...x, order: n } : x)].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)))
  }

  async function toggleHidden(i) {
    const next = i.hidden !== true
    try {
      await updateInterest(i.id, { hidden: next })
      setInterests(prev => prev.map(x => x.id === i.id ? { ...x, hidden: next } : x))
      addToast({
        type: 'success',
        title: next ? 'Interest hidden' : 'Interest visible',
        message: next ? `"${i.name}" no longer appears on the site.` : `"${i.name}" is live on the site again.`,
      })
    } catch (err) {
      addToast({ type: 'error', title: 'Could not change visibility', message: err?.message })
    }
  }

  const addButton = <Button variant="accent" size="sm" magnetic={false} icon={<Plus size={14} />} onClick={openNew}>Add interest</Button>

  return (
    <div>
      <SectionHeader
        description={<p>Interests shown on the Interests page, each with zero or more photos. Hidden interests are kept here but never shown on the site.</p>}
        action={addButton}
      />

      {loading ? <SkeletonRows rows={3} thumb />
        : interests.length === 0 ? <EmptyState title="No interests yet">Add the first one with the button above.</EmptyState>
        : (
          <div className={styles.workList}>
            {interests.map((i, idx) => {
              const isHidden = i.hidden === true
              const count = i.images?.length ?? 0
              return (
                <div key={i.id} className={cx(styles.workRow, isHidden && styles.rowHidden)} style={{ '--i': idx }}>
                  <div className={styles.workOrder}>
                    <input
                      type="number"
                      defaultValue={i.order}
                      className={styles.orderInput}
                      onBlur={e => saveOrder(i, e.target.value)}
                      aria-label={`Order of "${i.name}"`}
                    />
                    <span aria-hidden="true">Order</span>
                  </div>
                  <div className={styles.thumb}>
                    {i.coverImage
                      ? <span className={styles.thumbZoom}><img src={i.coverImage} alt="" loading="lazy" decoding="async" /></span>
                      : <span className={styles.thumbEmpty}><IconImage size={18} /></span>}
                  </div>
                  <div className={styles.workMain}>
                    <strong className={styles.rowTitle}>{i.name}</strong>
                    <div className={styles.rowMetaLine}>
                      <span className={styles.workYear}>{count} photo{count === 1 ? '' : 's'}</span>
                      {isHidden && <Pill tone="hidden">Hidden</Pill>}
                    </div>
                  </div>
                  <div className={styles.toggles}>
                    <button
                      type="button"
                      className={cx(styles.toggle, styles.toggleWarn)}
                      onClick={() => toggleHidden(i)}
                      aria-pressed={!isHidden}
                      title={isHidden ? 'Show this interest on the site' : 'Hide this interest from the site'}
                    >
                      {isHidden ? <IconEyeOff size={13} /> : <IconEye size={13} />} {isHidden ? 'Hidden' : 'Shown'}
                    </button>
                  </div>
                  <div className={styles.rowActions}>
                    <IconAction label={`Edit "${i.name}"`} onClick={() => openEdit(i)}><IconPencil size={15} /></IconAction>
                    <IconAction label={`Delete "${i.name}"`} danger onClick={() => remove(i)}><IconTrash size={15} /></IconAction>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      <Modal open={!!modal} onClose={close} title={modal?.mode === 'add' ? 'New interest' : 'Edit interest'} size="lg">
        <form onSubmit={save}>
          <div className={styles.grid2}>
            <div className={cx(styles.field, styles.span2)}><label htmlFor="if-name">Name *</label><input id="if-name" value={form.name} onChange={set('name')} placeholder="e.g. Photography, Baking, Hiking" /></div>
            <div className={cx(styles.field, styles.span2)}><label htmlFor="if-desc">Description</label><textarea id="if-desc" rows={3} value={form.description} onChange={set('description')} placeholder="A short note shown in the viewer (optional)" /></div>
            <div className={styles.field}><label htmlFor="if-order">Order</label><input id="if-order" type="number" value={form.order} onChange={set('order')} min="0" /></div>
            {/* Phrased as "on = live" but stored inverted, matching Projects. */}
            <div className={cx(styles.field, styles.checkField)}><input type="checkbox" checked={!form.hidden} onChange={e => setForm(f => ({ ...f, hidden: !e.target.checked }))} id="if-visible" /><label htmlFor="if-visible">Show on the site</label></div>
          </div>

          <div className={cx(styles.field, styles.fieldGap)}>
            <span className={styles.fieldLabel}>
              Photos
              {form.images.length > 0 && <span className={styles.uploadMsg}>{form.images.length} photo{form.images.length === 1 ? '' : 's'}</span>}
            </span>
            <p className={styles.hint}>
              It's fine to leave this empty - the interest still appears on the site. Use the arrows
              to reorder, the star to make one the cover image, and the cross to remove.
            </p>
            {form.images.length > 0 && (
              <div className={styles.gallery}>
                {form.images.map((url, i) => (
                  <div key={`${url}-${i}`} className={cx(styles.galleryItem, url === form.coverImage && styles.isCover)}>
                    <span className={styles.galleryZoom}><img src={url} alt={`Image ${i + 1}`} loading="lazy" decoding="async" /></span>
                    {url === form.coverImage ? <span className={styles.galleryFlag}>Cover</span> : <span className={styles.galleryIdx}>{i + 1}</span>}
                    <div className={styles.galleryBar}>
                      <button
                        type="button" className={styles.galleryBtn}
                        onClick={() => moveImage(i, -1)} disabled={i === 0}
                        aria-label={`Move image ${i + 1} earlier`}
                      ><IconChevLeft size={14} /></button>
                      <button
                        type="button" className={styles.galleryBtn}
                        onClick={() => makeCover(url)} disabled={url === form.coverImage}
                        aria-label={`Use image ${i + 1} as the cover`} title="Use as cover"
                      ><IconStar size={13} /></button>
                      <button
                        type="button" className={styles.galleryBtn}
                        onClick={() => moveImage(i, 1)} disabled={i === form.images.length - 1}
                        aria-label={`Move image ${i + 1} later`}
                      ><IconChevRight size={14} /></button>
                      <button
                        type="button" className={cx(styles.galleryBtn, styles.galleryBtnDanger)}
                        onClick={() => removeImage(i)}
                        aria-label={`Remove image ${i + 1}`}
                      ><Close size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <DropZone multiple busy={uploading} onFiles={handleImagesUpload} title="Add photos" hint="The first one becomes the cover" />
          </div>

          <div className={styles.formActions}>
            <Button size="sm" magnetic={false} onClick={close}>Cancel</Button>
            <Button variant="accent" size="sm" magnetic={false} type="submit" disabled={saving || uploading}>{saving ? 'Saving…' : 'Save interest'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
