import { useState, useEffect } from 'react'
import { getBioSection, updateBioSection } from '../../../firebase'
import { useToast } from '../../../context/ToastContext'
import Modal from '../../../components/Modal/Modal'
import styles from '../Admin.module.css'

const BLANK = { title: '', issuer: '', period: '', description: '', link: '' }

/**
 * Achievements - awards, competitions, publications, certifications.
 *
 * Stored as `portfolio_bio/achievements` with the same `{ items: [...] }`
 * shape as Education and Experience, so it needs no new Firestore rule: the
 * existing `portfolio_bio/{id}` match already covers it.
 */
export default function AchievementsSection() {
  const { addToast } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getBioSection('achievements').then(d => setItems(d?.items ?? [])).finally(() => setLoading(false))
  }, [])

  const set = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.value }))
  const openAdd = () => { setForm(BLANK); setModal({ mode: 'add' }) }
  const openEdit = (i) => { setForm({ ...BLANK, ...items[i] }); setModal({ mode: 'edit', index: i }) }
  const close = () => setModal(null)

  async function persist(next) {
    setItems(next)
    try { await updateBioSection('achievements', { items: next }) }
    catch { addToast({ type: 'error', title: 'Save failed' }) }
  }

  async function save(e) {
    e.preventDefault()
    if (!form.title.trim()) { addToast({ type: 'error', title: 'Title is required' }); return }
    setSaving(true)
    const next = modal.mode === 'add' ? [...items, form] : items.map((it, i) => i === modal.index ? form : it)
    await persist(next)
    setSaving(false)
    addToast({ type: 'success', title: modal.mode === 'add' ? 'Achievement added' : 'Achievement updated' })
    close()
  }

  async function remove(i) {
    if (!window.confirm('Delete this achievement?')) return
    await persist(items.filter((_, idx) => idx !== i))
    addToast({ type: 'success', title: 'Achievement deleted' })
  }

  /* Reordering by hand, because these are not naturally chronological the way
     Education and Experience are - a prize won in first year may still be the
     one that belongs at the top. */
  async function move(i, delta) {
    const j = i + delta
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    await persist(next)
  }

  return (
    <div>
      <div className={styles.sectionHeader}>
        <p className={styles.intro} style={{ margin: 0 }}>
          Awards, competitions, publications and certifications. Shown on the About
          page between Experience and Skills; the section is hidden while this list
          is empty.
        </p>
        <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={openAdd}>+ Add Achievement</button>
      </div>

      {loading ? <p className={styles.empty}>Loading…</p>
        : items.length === 0 ? <p className={styles.empty}>No achievements yet. Add your first one above.</p>
        : items.map((it, i) => (
          <div key={i} className={styles.listRow}>
            <div className={styles.listRowContent}>
              <strong>{it.title}</strong>
              <span className={styles.meta}>
                {[it.issuer, it.period].filter(Boolean).join(' · ')}
              </span>
            </div>
            <div className={styles.listRowActions}>
              <button
                className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`}
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={`Move "${it.title}" up`}
              >↑</button>
              <button
                className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`}
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
                aria-label={`Move "${it.title}" down`}
              >↓</button>
              <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} onClick={() => openEdit(i)}>Edit</button>
              <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => remove(i)}>Delete</button>
            </div>
          </div>
        ))}

      <Modal open={!!modal} onClose={close} title={modal?.mode === 'add' ? 'Add Achievement' : 'Edit Achievement'}>
        <form onSubmit={save}>
          <div className={styles.grid2}>
            <div className={`${styles.field} ${styles.span2}`}>
              <label>Title *</label>
              <input value={form.title} onChange={set('title')} placeholder="Dean's Merit List" />
            </div>
            <div className={styles.field}>
              <label>Awarded by</label>
              <input value={form.issuer} onChange={set('issuer')} placeholder="University of Pretoria" />
            </div>
            <div className={styles.field}>
              <label>Year / Period</label>
              <input value={form.period} onChange={set('period')} placeholder="2025" />
            </div>
            <div className={`${styles.field} ${styles.span2}`}>
              <label>Description</label>
              <textarea rows={3} value={form.description} onChange={set('description')} placeholder="Brief description…" />
            </div>
            <div className={`${styles.field} ${styles.span2}`}>
              <label>Link (optional)</label>
              <input value={form.link} onChange={set('link')} placeholder="example.co.za/award" />
              <p className={styles.hint}>
                You can leave off the “https://” - it is added for you.
              </p>
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={close}>Cancel</button>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
