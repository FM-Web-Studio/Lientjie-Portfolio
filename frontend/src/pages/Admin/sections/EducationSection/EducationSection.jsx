import { useState, useEffect } from 'react'
import { getBioSection, updateBioSection } from '../../../../firebase'
import { useToast } from '../../../../context/ToastContext'
import Modal from '../../../../components/Modal'
import styles from '../../Admin.module.css'

const BLANK = { institution: '', degree: '', period: '', description: '' }

export default function EducationSection() {
  const { addToast } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // { mode:'add'|'edit', index? }
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getBioSection('education').then(d => setItems(d?.items ?? [])).finally(() => setLoading(false))
  }, [])

  const set = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.value }))
  const openAdd = () => { setForm(BLANK); setModal({ mode: 'add' }) }
  const openEdit = (i) => { setForm(items[i]); setModal({ mode: 'edit', index: i }) }
  const close = () => setModal(null)

  async function persist(next) {
    setItems(next)
    try { await updateBioSection('education', { items: next }) }
    catch { addToast({ type: 'error', title: 'Save failed' }) }
  }

  async function save(e) {
    e.preventDefault()
    if (!form.institution.trim() || !form.degree.trim()) { addToast({ type: 'error', title: 'Institution and degree are required' }); return }
    setSaving(true)
    const next = modal.mode === 'add' ? [...items, form] : items.map((it, i) => i === modal.index ? form : it)
    await persist(next)
    setSaving(false)
    addToast({ type: 'success', title: modal.mode === 'add' ? 'Entry added' : 'Entry updated' })
    close()
  }

  async function remove(i) {
    if (!window.confirm('Delete this entry?')) return
    await persist(items.filter((_, idx) => idx !== i))
    addToast({ type: 'success', title: 'Entry deleted' })
  }

  return (
    <div>
      <div className={styles.sectionHeader}>
        <p className={styles.intro} style={{ margin: 0 }}>Education timeline shown on the About page.</p>
        <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={openAdd}>+ Add Entry</button>
      </div>

      {loading ? <p className={styles.empty}>Loading…</p>
        : items.length === 0 ? <p className={styles.empty}>No education entries yet.</p>
        : items.map((it, i) => (
          <div key={i} className={styles.listRow}>
            <div className={styles.listRowContent}>
              <strong>{it.degree}</strong>
              <span className={styles.meta}>{it.institution}{it.period ? ` · ${it.period}` : ''}</span>
            </div>
            <div className={styles.listRowActions}>
              <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} onClick={() => openEdit(i)}>Edit</button>
              <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => remove(i)}>Delete</button>
            </div>
          </div>
        ))}

      <Modal open={!!modal} onClose={close} title={modal?.mode === 'add' ? 'Add Education' : 'Edit Education'}>
        <form onSubmit={save}>
          <div className={styles.grid2}>
            <div className={styles.field}><label>Institution *</label><input value={form.institution} onChange={set('institution')} placeholder="University of Johannesburg" /></div>
            <div className={styles.field}><label>Degree / Qualification *</label><input value={form.degree} onChange={set('degree')} placeholder="Bachelor of Architecture" /></div>
            <div className={`${styles.field} ${styles.span2}`}><label>Period</label><input value={form.period} onChange={set('period')} placeholder="2023 - Present" /></div>
            <div className={`${styles.field} ${styles.span2}`}><label>Description</label><textarea rows={3} value={form.description} onChange={set('description')} placeholder="Brief description…" /></div>
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
