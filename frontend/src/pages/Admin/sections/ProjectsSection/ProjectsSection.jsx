import { useState, useEffect, useMemo } from 'react'
import {
  getProjects, createProject, updateProject, deleteProject, uploadMultiple,
  pruneUnusedImages, storageUrlsIn,
} from '../../../../firebase'
import { useToast } from '../../../../context/ToastContext'
import { useContent } from '../../../../context/ContentContext'
import Modal from '../../../../components/Modal'
import Button from '../../../../components/Button'
import { Plus, Close } from '../../../../components/Icons'
import { SectionHeader, EmptyState, SkeletonRows, DropZone, Pill, IconAction, cx } from '../../ui'
import { IconPencil, IconTrash, IconStar, IconEye, IconEyeOff, IconImage, IconChevLeft, IconChevRight } from '../../icons'
import styles from '../../Admin.module.css'

// Last-resort seeds, used only when there are no configured categories and no project has one.
const SEED_CATEGORIES = ['academic', 'installation', 'structural', 'urban', 'residential', 'competition']

const BLANK = {
  title: '', description: '', longDescription: '', year: new Date().getFullYear(),
  category: '', tags: '', coverImage: '', images: [], featured: false, order: 99,
  hidden: false,
}

const slug = (s) => (s || 'untitled').toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled'

export default function ProjectsSection() {
  const { addToast } = useToast()
  // The Work page's own filter list comes first: it is the taxonomy visitors actually see.
  const { copy } = useContent()
  const configured = copy('work').categories
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // { mode, id? }
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const load = () => getProjects().then(setProjects).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  // Configured categories first, then any a project already uses. Deduped ignoring case; the configured spelling wins.
  const categoryOptions = useMemo(() => {
    const seen = new Map()
    const add = c => {
      const v = (c ?? '').trim()
      if (v && !seen.has(v.toLowerCase())) seen.set(v.toLowerCase(), v)
    }
    for (const c of (configured ?? '').split(',')) add(c)
    for (const p of projects) add(p.category)
    if (seen.size === 0) SEED_CATEGORIES.forEach(add)
    return [...seen.values()]
  }, [configured, projects])

  const set = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  // A new project opens on the first configured category, so it always has a filter chip.
  function openNew() {
    setForm({ ...BLANK, category: categoryOptions[0] ?? '', order: projects.length + 1 })
    setModal({ mode: 'add' })
  }
  function openEdit(p) {
    setForm({
      ...BLANK,
      ...p,
      tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
      images: Array.isArray(p.images) ? p.images : [],
    })
    setModal({ mode: 'edit', id: p.id })
  }
  const close = () => setModal(null)

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const [url] = await uploadMultiple([file], `portfolio/projects/${slug(form.title)}`)
      setForm(f => ({ ...f, coverImage: url }))
    } catch { addToast({ type: 'error', title: 'Cover upload failed' }) }
    finally { setUploading(false) }
  }

  async function handleImagesUpload(e) {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    try {
      const urls = await uploadMultiple(files, `portfolio/projects/${slug(form.title)}`)
      setForm(f => ({ ...f, images: [...f.images, ...urls] }))
    } catch { addToast({ type: 'error', title: 'Image upload failed' }) }
    finally { setUploading(false) }
  }

  // Removing only unlinks from the form. The file is pruned after a save, so Cancel leaves it untouched.
  const removeImage = (i) =>
    setForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))

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
    if (!form.title.trim()) { addToast({ type: 'error', title: 'Title is required' }); return }
    setSaving(true)
    // What this project pointed at before the edit. Anything dropped from the
    // list is deleted after the save, not now, so Cancel is still safe.
    const previous = modal.mode === 'edit'
      ? storageUrlsIn(projects.find(p => p.id === modal.id) || {})
      : []
    try {
      const { id, ...rest } = form
      const data = {
        ...rest,
        year: Number(form.year) || new Date().getFullYear(),
        order: Number(form.order) || 0,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        images: form.images.filter(Boolean),
      }
      if (modal.mode === 'add') await createProject(data)
      else await updateProject(modal.id, data)
      addToast({ type: 'success', title: modal.mode === 'add' ? 'Project created' : 'Project updated' })
      close()
      load()
      await pruneUnusedImages(previous)
    } catch (err) {
      addToast({ type: 'error', title: 'Save failed', message: err?.message })
    } finally { setSaving(false) }
  }

  async function remove(p) {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return
    const previous = storageUrlsIn(p)
    await deleteProject(p.id)
    setProjects(ps => ps.filter(x => x.id !== p.id))
    addToast({ type: 'success', title: 'Project deleted' })
    await pruneUnusedImages(previous)
  }

  async function saveOrder(p, order) {
    const n = Number(order)
    if (Number.isNaN(n)) return
    await updateProject(p.id, { order: n })
    setProjects(prev => [...prev.map(x => x.id === p.id ? { ...x, order: n } : x)].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)))
  }

  async function toggleFeatured(p) {
    await updateProject(p.id, { featured: !p.featured })
    setProjects(prev => prev.map(x => x.id === p.id ? { ...x, featured: !x.featured } : x))
  }

  // Hiding parks a project off the site without deleting it.
  // Older projects have no `hidden` field, so absence reads as visible.
  async function toggleHidden(p) {
    const next = p.hidden !== true
    try {
      await updateProject(p.id, { hidden: next })
      setProjects(prev => prev.map(x => x.id === p.id ? { ...x, hidden: next } : x))
      addToast({
        type: 'success',
        title: next ? 'Project hidden' : 'Project visible',
        message: next
          ? `"${p.title}" no longer appears on the site.`
          : `"${p.title}" is live on the site again.`,
      })
    } catch (err) {
      addToast({ type: 'error', title: 'Could not change visibility', message: err?.message })
    }
  }

  const addButton = <Button variant="accent" size="sm" magnetic={false} icon={<Plus size={14} />} onClick={openNew}>Add project</Button>

  return (
    <div>
      <SectionHeader
        description={<p>Projects shown on the Work page and, when featured, the home page. Hidden projects are kept here but never shown on the site.</p>}
        action={addButton}
      />

      {loading ? <SkeletonRows rows={4} thumb />
        : projects.length === 0 ? <EmptyState title="No projects yet">Add your first one with the button above.</EmptyState>
        : (
          <div className={styles.workList}>
            {projects.map((p, idx) => {
              const isHidden = p.hidden === true
              return (
                <div key={p.id} className={cx(styles.workRow, isHidden && styles.rowHidden)} style={{ '--i': idx }}>
                  <div className={styles.workOrder}>
                    <input
                      type="number"
                      defaultValue={p.order}
                      className={styles.orderInput}
                      onBlur={e => saveOrder(p, e.target.value)}
                      aria-label={`Order of "${p.title}"`}
                    />
                    <span aria-hidden="true">Order</span>
                  </div>
                  <div className={styles.thumb}>
                    {p.coverImage
                      ? <span className={styles.thumbZoom}><img src={p.coverImage} alt="" loading="lazy" decoding="async" /></span>
                      : <span className={styles.thumbEmpty}><IconImage size={18} /></span>}
                  </div>
                  <div className={styles.workMain}>
                    <strong className={styles.rowTitle}>{p.title}</strong>
                    <div className={styles.rowMetaLine}>
                      {p.category && <Pill tone="cat">{p.category}</Pill>}
                      {p.year && <span className={styles.workYear}>{p.year}</span>}
                      {p.featured && <Pill tone="featured">Featured</Pill>}
                      {isHidden && <Pill tone="hidden">Hidden</Pill>}
                    </div>
                  </div>
                  <div className={styles.toggles}>
                    <button
                      type="button"
                      className={styles.toggle}
                      onClick={() => toggleFeatured(p)}
                      aria-pressed={!!p.featured}
                      title={p.featured ? 'Remove from the home page' : 'Feature on the home page'}
                    >
                      <IconStar size={13} className={styles.starFill} /> Featured
                    </button>
                    <button
                      type="button"
                      className={cx(styles.toggle, styles.toggleWarn)}
                      onClick={() => toggleHidden(p)}
                      aria-pressed={!isHidden}
                      title={isHidden ? 'Show this project on the site' : 'Hide this project from the site'}
                    >
                      {isHidden ? <IconEyeOff size={13} /> : <IconEye size={13} />} {isHidden ? 'Hidden' : 'Shown'}
                    </button>
                  </div>
                  <div className={styles.rowActions}>
                    <IconAction label={`Edit "${p.title}"`} onClick={() => openEdit(p)}><IconPencil size={15} /></IconAction>
                    <IconAction label={`Delete "${p.title}"`} danger onClick={() => remove(p)}><IconTrash size={15} /></IconAction>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      <Modal open={!!modal} onClose={close} title={modal?.mode === 'add' ? 'New project' : 'Edit project'} size="lg">
        <form onSubmit={save}>
          <p className={styles.cardLabel}>Details</p>
          <div className={styles.grid2}>
            <div className={cx(styles.field, styles.span2)}><label htmlFor="pf-title">Title *</label><input id="pf-title" value={form.title} onChange={set('title')} placeholder="Project title" /></div>
            <div className={cx(styles.field, styles.span2)}><label htmlFor="pf-desc">Short description</label><textarea id="pf-desc" rows={2} value={form.description} onChange={set('description')} placeholder="One-sentence summary shown on cards" /></div>
            <div className={cx(styles.field, styles.span2)}><label htmlFor="pf-long">Long description</label><textarea id="pf-long" rows={4} value={form.longDescription} onChange={set('longDescription')} placeholder="Full description shown in the lightbox" /></div>
            <div className={styles.field}><label htmlFor="pf-year">Year</label><input id="pf-year" type="number" value={form.year} onChange={set('year')} min="2000" max="2099" /></div>
            <div className={styles.field}>
              <label htmlFor="pf-category">Category</label>
              {/* A text box with suggestions, not a select: typing a new category is the main action. */}
              <input
                id="pf-category"
                list="pf-category-options"
                value={form.category}
                onChange={set('category')}
                placeholder="Type a category, or pick an existing one"
                autoComplete="off"
              />
              <datalist id="pf-category-options">
                {categoryOptions.map(c => <option key={c} value={c} />)}
              </datalist>
              <p className={styles.hint}>
                Free text. The suggestions are the filter categories from{' '}
                <strong>Site Copy → Work</strong> plus any already used by a project.
                Anything new you type here appears as a filter on the Work page
                automatically.
              </p>
            </div>
            <div className={cx(styles.field, styles.span2)}><label htmlFor="pf-tags">Tags (comma-separated)</label><input id="pf-tags" value={form.tags} onChange={set('tags')} placeholder="structural, campus, 2025" /></div>
          </div>

          <p className={cx(styles.cardLabel, styles.cardLabelGap)}>Placement</p>
          <div className={styles.grid2}>
            <div className={styles.field}><label htmlFor="pf-order">Order</label><input id="pf-order" type="number" value={form.order} onChange={set('order')} min="0" /></div>
            <div className={styles.switches}>
              <div className={cx(styles.field, styles.checkField)}><input type="checkbox" checked={form.featured} onChange={set('featured')} id="pf-featured" /><label htmlFor="pf-featured">Show on home page (featured)</label></div>
              {/* Phrased as "on = live" but stored inverted, so legacy documents without `hidden` stay visible. */}
              <div className={cx(styles.field, styles.checkField)}><input type="checkbox" checked={!form.hidden} onChange={e => setForm(f => ({ ...f, hidden: !e.target.checked }))} id="pf-visible" /><label htmlFor="pf-visible">Show on the site</label></div>
            </div>
          </div>

          <p className={cx(styles.cardLabel, styles.cardLabelGap)}>Images</p>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Cover image</span>
            <p className={styles.hint}>Used on the Work page and, when featured, the home page.</p>
            <div className={styles.imgField}>
              <div className={cx(styles.preview, styles.previewWide)}>
                {form.coverImage
                  ? <img key={form.coverImage} src={form.coverImage} alt="Cover" decoding="async" />
                  : <span className={styles.previewEmpty}>No cover yet</span>}
              </div>
              <div className={styles.imgSide}>
                <DropZone
                  compact
                  busy={uploading}
                  onFiles={handleCoverUpload}
                  title={form.coverImage ? 'Replace cover' : 'Upload cover'}
                />
                {form.coverImage && (
                  <div className={styles.imgRow}>
                    <Button
                      size="sm"
                      magnetic={false}
                      className={cx(styles.danger, styles.noNudge)}
                      icon={<IconTrash size={14} />}
                      onClick={() => setForm(f => ({ ...f, coverImage: '' }))}
                    >
                      Remove cover
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={cx(styles.field, styles.fieldGap)}>
            <span className={styles.fieldLabel}>
              Gallery images
              {form.images.length > 0 && <span className={styles.uploadMsg}>{form.images.length} image{form.images.length === 1 ? '' : 's'}</span>}
            </span>
            <p className={styles.hint}>
              Shown in the project viewer, in this order. Use the arrows to reorder, the star
              to make one the cover image, and the cross to remove.
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
            <DropZone multiple busy={uploading} onFiles={handleImagesUpload} title="Add gallery images" hint="Drop several at once, or click to browse" />
          </div>

          <div className={styles.formActions}>
            <Button size="sm" magnetic={false} onClick={close}>Cancel</Button>
            <Button variant="accent" size="sm" magnetic={false} type="submit" disabled={saving || uploading}>{saving ? 'Saving…' : 'Save project'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
