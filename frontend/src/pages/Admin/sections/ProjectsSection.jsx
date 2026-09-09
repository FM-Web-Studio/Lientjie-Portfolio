import { useState, useEffect, useMemo } from 'react'
import { getProjects, createProject, updateProject, deleteProject, uploadMultiple } from '../../../firebase'
import { useToast } from '../../../context/ToastContext'
import { useContent } from '../../../context/ContentContext'
import Modal from '../../../components/Modal/Modal'
import styles from '../Admin.module.css'

/*
 * Last-resort seeds, used ONLY on a site that has neither configured filter
 * categories nor a single project filed under anything. Once either exists,
 * these are dropped rather than appended: leaving six unrelated defaults under
 * the real taxonomy is what made the menu look like it could not be changed.
 */
const SEED_CATEGORIES = ['academic', 'installation', 'structural', 'urban', 'residential', 'competition']

const BLANK = {
  title: '', description: '', longDescription: '', year: new Date().getFullYear(),
  category: '', tags: '', coverImage: '', images: [], featured: false, order: 99,
  hidden: false,
}

const slug = (s) => (s || 'untitled').toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled'

export default function ProjectsSection() {
  const { addToast } = useToast()
  /* The Work page's own filter list. It is the taxonomy visitors actually see,
     so it has to be the first thing offered here - previously the two were
     configured in different places and never met, and the categories on the
     live site could not be picked from this dropdown at all. */
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

  /*
   * The filter categories from Site Copy first, in their configured order, then
   * anything a project already uses that is not among them. Deduped without
   * regard to case, keeping the first spelling seen, so a configured "Urban"
   * and a stored "urban" do not split the menu in two - and the configured
   * spelling wins, which is the one the Work page prints on its chips.
   */
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

  /* A new project opens on the first configured category rather than on a
     hardcoded default, which would otherwise file it under a name that has no
     filter chip on the Work page. */
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

  /*
   * Gallery editing. Removing an image here unlinks it from the project; the
   * file itself is left in Storage, matching what deleting a whole project
   * already does. Re-uploading is cheap, and a delete that reaches into
   * Storage would silently break any other project reusing the same file.
   */
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
    } catch (err) {
      addToast({ type: 'error', title: 'Save failed', message: err?.message })
    } finally { setSaving(false) }
  }

  async function remove(p) {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return
    await deleteProject(p.id)
    setProjects(ps => ps.filter(x => x.id !== p.id))
    addToast({ type: 'success', title: 'Project deleted' })
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

  /*
   * Hiding a project takes it off the Work page and the home page without
   * deleting it - the images stay in Storage and the copy stays written, so
   * an unfinished or retired project can be parked and brought back later.
   *
   * `hidden` is undefined on every project saved before this field existed,
   * so the toggle reads the absence as visible and writes an explicit `true`.
   */
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

  return (
    <div>
      <div className={styles.sectionHeader}>
        <p className={styles.intro} style={{ margin: 0 }}>Projects shown on the Work page and (when featured) the home page. Hidden projects are kept here but never shown on the site.</p>
        <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={openNew}>+ Add Project</button>
      </div>

      {loading ? <p className={styles.empty}>Loading…</p>
        : projects.length === 0 ? <p className={styles.empty}>No projects yet. Add your first one above.</p>
        : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Order</th><th>Image</th><th>Title</th><th>Category</th><th>Year</th><th>Featured</th><th>Visible</th><th>Actions</th></tr></thead>
              <tbody>
                {projects.map(p => {
                  const isHidden = p.hidden === true
                  return (
                  <tr key={p.id} className={isHidden ? styles.rowHidden : undefined}>
                    <td><input type="number" defaultValue={p.order} className={styles.orderInput} onBlur={e => saveOrder(p, e.target.value)} /></td>
                    <td>{p.coverImage && <img src={p.coverImage} alt="" className={styles.thumb} />}</td>
                    <td>
                      <strong>{p.title}</strong>
                      {isHidden && <span className={styles.hiddenTag}>Hidden</span>}
                    </td>
                    <td><span className={styles.catTag}>{p.category}</span></td>
                    <td>{p.year}</td>
                    <td><button className={`${styles.btn} ${styles.btnSm} ${p.featured ? styles.btnPrimary : styles.btnOutline}`} onClick={() => toggleFeatured(p)}>{p.featured ? 'Yes' : 'No'}</button></td>
                    <td>
                      <button
                        className={`${styles.btn} ${styles.btnSm} ${isHidden ? styles.btnOutline : styles.btnPrimary}`}
                        onClick={() => toggleHidden(p)}
                        aria-pressed={!isHidden}
                        title={isHidden ? 'Show this project on the site' : 'Hide this project from the site'}
                      >
                        {isHidden ? 'Hidden' : 'Shown'}
                      </button>
                    </td>
                    <td className={styles.actions}>
                      <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} onClick={() => openEdit(p)}>Edit</button>
                      <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => remove(p)}>Delete</button>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

      <Modal open={!!modal} onClose={close} title={modal?.mode === 'add' ? 'New Project' : 'Edit Project'} size="lg">
        <form onSubmit={save}>
          <div className={styles.grid2}>
            <div className={`${styles.field} ${styles.span2}`}><label>Title *</label><input value={form.title} onChange={set('title')} placeholder="Project title" /></div>
            <div className={`${styles.field} ${styles.span2}`}><label>Short Description</label><textarea rows={2} value={form.description} onChange={set('description')} placeholder="One-sentence summary shown on cards" /></div>
            <div className={`${styles.field} ${styles.span2}`}><label>Long Description</label><textarea rows={4} value={form.longDescription} onChange={set('longDescription')} placeholder="Full description shown in the lightbox" /></div>
            <div className={styles.field}><label>Year</label><input type="number" value={form.year} onChange={set('year')} min="2000" max="2099" /></div>
            <div className={styles.field}>
              <label htmlFor="pf-category">Category</label>
              {/*
                A plain text box with a <datalist> of what already exists, rather
                than a select. Typing is the primary action and the suggestions
                are only a shortcut, which is the opposite of how a dropdown
                behaves: the old creatable select made you pick an "Add category"
                row before it would accept what you had already typed.
              */}
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
            <div className={styles.field}><label>Order</label><input type="number" value={form.order} onChange={set('order')} min="0" /></div>
            <div className={`${styles.field} ${styles.checkField}`}><input type="checkbox" checked={form.featured} onChange={set('featured')} id="pf-featured" /><label htmlFor="pf-featured">Show on home page (featured)</label></div>
            {/* Phrased positively and stored inverted: the checkbox reads as
                "on = live", while the field stays `hidden` so untouched legacy
                documents keep defaulting to visible. */}
            <div className={`${styles.field} ${styles.checkField}`}><input type="checkbox" checked={!form.hidden} onChange={e => setForm(f => ({ ...f, hidden: !e.target.checked }))} id="pf-visible" /><label htmlFor="pf-visible">Show on the site</label></div>
            <div className={`${styles.field} ${styles.span2}`}><label>Tags (comma-separated)</label><input value={form.tags} onChange={set('tags')} placeholder="structural, campus, 2025" /></div>

            <div className={`${styles.field} ${styles.span2}`}>
              <label>Cover image</label>
              <p className={styles.hint}>Used on the Work page and, when featured, the home page.</p>
              {form.coverImage
                ? <img src={form.coverImage} alt="Cover" className={styles.imgPreview} />
                : <p className={styles.uploadMsg}>No cover chosen yet.</p>}
              <div className={styles.imgRow}>
                <label className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm} ${styles.uploadBtn}`}>
                  {uploading ? 'Uploading…' : form.coverImage ? 'Replace cover' : 'Upload cover'}
                  <input type="file" accept="image/*" onChange={handleCoverUpload} hidden disabled={uploading} />
                </label>
                {form.coverImage && (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`}
                    onClick={() => setForm(f => ({ ...f, coverImage: '' }))}
                  >
                    Remove cover
                  </button>
                )}
              </div>
            </div>

            <div className={`${styles.field} ${styles.span2}`}>
              <label>Gallery images</label>
              <p className={styles.hint}>
                Shown in the project viewer, in this order. Use ‹ › to reorder,
                ★ to make one the cover image, and ✕ to remove.
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
                  {uploading ? 'Uploading…' : 'Add images'}
                  <input type="file" accept="image/*" multiple onChange={handleImagesUpload} hidden disabled={uploading} />
                </label>
                {form.images.length > 0 && (
                  <span className={styles.uploadMsg}>
                    {form.images.length} image{form.images.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={close}>Cancel</button>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving || uploading}>{saving ? 'Saving…' : 'Save Project'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
