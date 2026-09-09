import { useState, useEffect } from 'react'
import { getBioSection, updateBioSection } from '../../../firebase'
import { useToast } from '../../../context/ToastContext'
import Modal from '../../../components/Modal/Modal'
import styles from '../Admin.module.css'

const BLANK = { company: '', role: '', period: '', description: '', link: '' }

export default function ExperienceSection() {
  const { addToast } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getBioSection('experience').then(d => setItems(d?.items ?? [])).finally(() => setLoading(false))
  }, [])

  const set = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.value }))
  const openAdd = () => { setForm(BLANK); setModal({ mode: 'add' }) }
  /* Spread over BLANK, not used raw: entries saved before a field existed
     have no key for it, and feeding undefined into a controlled input makes
     React switch it to uncontrolled and warn. */
  const openEdit = (i) => { setForm({ ...BLANK, ...items[i] }); setModal({ mode: 'edit', index: i }) }
  const close = () => setModal(null)

  async function persist(next) {
    setItems(next)
    try { await updateBioSection('experience', { items: next }) }
    catch { addToast({ type: 'error', title: 'Save failed' }) }
  }

  async function save(e) {
    e.preventDefault()
    if (!form.company.trim() || !form.role.trim()) { addToast({ type: 'error', title: 'Company and role are required' }); return }
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
        <p className={styles.intro} style={{ margin: 0 }}>Experience timeline shown on the About page.</p>
        <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={openAdd}>+ Add Entry</button>
      </div>

      {loading ? <p className={styles.empty}>Loading…</p>
        : items.length === 0 ? <p className={styles.empty}>No experience entries yet.</p>
        : items.map((it, i) => (
          <div key={i} className={styles.listRow}>
            <div className={styles.listRowContent}>
              <strong>{it.role}</strong>
              <span className={styles.meta}>{it.company}{it.period ? ` · ${it.period}` : ''}</span>
            </div>
            <div className={styles.listRowActions}>
              <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} onClick={() => openEdit(i)}>Edit</button>
              <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => remove(i)}>Delete</button>
            </div>
          </div>
        ))}

      <Modal open={!!modal} onClose={close} title={modal?.mode === 'add' ? 'Add Experience' : 'Edit Experience'}>
        <form onSubmit={save}>
          <div className={styles.grid2}>
            <div className={styles.field}><label>Company / Organisation *</label><input value={form.company} onChange={set('company')} placeholder="Klad Studios Architecture" /></div>
            <div className={styles.field}><label>Role / Position *</label><input value={form.role} onChange={set('role')} placeholder="Job Shadow" /></div>
            <div className={`${styles.field} ${styles.span2}`}><label>Period</label><input value={form.period} onChange={set('period')} placeholder="2023" /></div>
            <div className={`${styles.field} ${styles.span2}`}><label>Description</label><textarea rows={3} value={form.description} onChange={set('description')} placeholder="Brief description…" /></div>
            <div className={`${styles.field} ${styles.span2}`}>
              <label>Website link (optional)</label>
              <input value={form.link} onChange={set('link')} placeholder="lientjiepetsitting.co.za" />
              <p className={styles.hint}>
                Shown as a clickable link under the entry on the About page.
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
