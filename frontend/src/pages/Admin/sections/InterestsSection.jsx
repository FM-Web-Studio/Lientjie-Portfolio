import { useState, useEffect } from 'react'
import { getInterests, createInterest, updateInterest, deleteInterest, uploadMultiple } from '../../../firebase'
import { useToast } from '../../../context/ToastContext'
import Modal from '../../../components/Modal/Modal'
import styles from '../Admin.module.css'

const BLANK = {
  name: '', description: '', coverImage: '', images: [], order: 99, hidden: false,
}

const slug = (s) => (s || 'untitled').toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled'

/**
 * Interests shown on the public Interests page. Deliberately lighter than
 * Projects - no category, year or tags, since these are personal hobbies
 * rather than portfolio pieces. An interest can be saved with zero images;
 * the public page shows it as a "coming soon" tile rather than hiding it.
 */
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
        // First upload on an empty interest becomes the cover automatically -
        // otherwise a freshly added interest has photos but no thumbnail
        // until someone remembers to star one.
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
    } catch (err) {
      addToast({ type: 'error', title: 'Save failed', message: err?.message })
    } finally { setSaving(false) }
  }

  async function remove(i) {
    if (!window.confirm(`Delete "${i.name}"? This cannot be undone.`)) return
    await deleteInterest(i.id)
    setInterests(is => is.filter(x => x.id !== i.id))
    addToast({ type: 'success', title: 'Interest deleted' })
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

  return (
    <div>
      <div className={styles.sectionHeader}>
        <p className={styles.intro} style={{ margin: 0 }}>
          Interests shown on the Interests page - each can have zero or more photos.
          Hidden interests are kept here but never shown on the site.
        </p>
        <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={openNew}>+ Add Interest</button>
      </div>

      {loading ? <p className={styles.empty}>Loading…</p>
        : interests.length === 0 ? <p className={styles.empty}>No interests yet. Add the first one above.</p>
        : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Order</th><th>Image</th><th>Name</th><th>Photos</th><th>Visible</th><th>Actions</th></tr></thead>
              <tbody>
                {interests.map(i => {
                  const isHidden = i.hidden === true
                  return (
                  <tr key={i.id} className={isHidden ? styles.rowHidden : undefined}>
                    <td><input type="number" defaultValue={i.order} className={styles.orderInput} onBlur={e => saveOrder(i, e.target.value)} /></td>
                    <td>{i.coverImage && <img src={i.coverImage} alt="" className={styles.thumb} />}</td>
                    <td>
                      <strong>{i.name}</strong>
                      {isHidden && <span className={styles.hiddenTag}>Hidden</span>}
                    </td>
                    <td>{i.images?.length ?? 0}</td>
                    <td>
                      <button
                        className={`${styles.btn} ${styles.btnSm} ${isHidden ? styles.btnOutline : styles.btnPrimary}`}
                        onClick={() => toggleHidden(i)}
                        aria-pressed={!isHidden}
                        title={isHidden ? 'Show this interest on the site' : 'Hide this interest from the site'}
                      >
                        {isHidden ? 'Hidden' : 'Shown'}
                      </button>
                    </td>
                    <td className={styles.actions}>
                      <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} onClick={() => openEdit(i)}>Edit</button>
                      <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => remove(i)}>Delete</button>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

      <Modal open={!!modal} onClose={close} title={modal?.mode === 'add' ? 'New Interest' : 'Edit Interest'} size="lg">
        <form onSubmit={save}>
          <div className={styles.grid2}>
            <div className={`${styles.field} ${styles.span2}`}><label>Name *</label><input value={form.name} onChange={set('name')} placeholder="e.g. Photography, Baking, Hiking" /></div>
            <div className={`${styles.field} ${styles.span2}`}><label>Description</label><textarea rows={3} value={form.description} onChange={set('description')} placeholder="A short note shown in the viewer (optional)" /></div>
            <div className={styles.field}><label>Order</label><input type="number" value={form.order} onChange={set('order')} min="0" /></div>
            {/* Phrased positively and stored inverted, matching Projects: the
                checkbox reads as "on = live" while the field stays `hidden` so
                untouched legacy documents keep defaulting to visible. */}
            <div className={`${styles.field} ${styles.checkField}`}><input type="checkbox" checked={!form.hidden} onChange={e => setForm(f => ({ ...f, hidden: !e.target.checked }))} id="if-visible" /><label htmlFor="if-visible">Show on the site</label></div>

            <div className={`${styles.field} ${styles.span2}`}>
              <label>Photos</label>
              <p className={styles.hint}>
                It's fine to leave this empty - the interest still appears on the site. Use ‹ › to
                reorder, ★ to make one the cover image, and ✕ to remove.
              </p>
              {form.images.length > 0 && (
                <div className={styles.gallery}>
                  {form.images.map((url, i) => (
                    <div key={`${url}-${i}`} className={styles.galleryItem}>
                      <img src={url} alt={`Image ${i + 1}`} />
                      {url === form.coverImage && <span className={styles.galleryFlag}>Cover</span>}
                      <div className={styles.galleryBar}>
                        <button
                          type="button" className={styles.galleryBtn}
                          onClick={() => moveImage(i, -1)} disabled={i === 0}
                          aria-label={`Move image ${i + 1} earlier`}
                        >‹</button>
                        <button
                          type="button" className={styles.galleryBtn}
                          onClick={() => makeCover(url)} disabled={url === form.coverImage}
                          aria-label={`Use image ${i + 1} as the cover`} title="Use as cover"
                        >★</button>
                        <button
                          type="button" className={styles.galleryBtn}
                          onClick={() => moveImage(i, 1)} disabled={i === form.images.length - 1}
                          aria-label={`Move image ${i + 1} later`}
                        >›</button>
                        <button
                          type="button" className={`${styles.galleryBtn} ${styles.galleryBtnDanger}`}
                          onClick={() => removeImage(i)}
                          aria-label={`Remove image ${i + 1}`}
                        >✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className={styles.imgRow}>
                <label className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm} ${styles.uploadBtn}`}>
                  {uploading ? 'Uploading…' : 'Add photos'}
                  <input type="file" accept="image/*" multiple onChange={handleImagesUpload} hidden disabled={uploading} />
                </label>
                {form.images.length > 0 && (
                  <span className={styles.uploadMsg}>
                    {form.images.length} photo{form.images.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={close}>Cancel</button>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving || uploading}>{saving ? 'Saving…' : 'Save Interest'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
