import { useState, useEffect } from 'react'
import { getBioSection, updateBioSection } from '../../../../firebase'
import { useToast } from '../../../../context/ToastContext'
import Modal from '../../../../components/Modal'
import Button from '../../../../components/Button'
import { Plus } from '../../../../components/Icons'
import { SectionHeader, EmptyState, SkeletonRows, IconAction, cx } from '../../ui'
import { IconPencil, IconTrash } from '../../icons'
import styles from '../../Admin.module.css'

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
  // Spread over BLANK: older entries lack newer keys, and undefined would make the inputs uncontrolled.
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

  const addButton = <Button variant="accent" size="sm" magnetic={false} icon={<Plus size={14} />} onClick={openAdd}>Add entry</Button>

  return (
    <div>
      <SectionHeader description={<p>Experience timeline shown on the About page.</p>} action={addButton} />

      {loading ? <SkeletonRows rows={3} />
        : items.length === 0 ? <EmptyState title="No experience yet">Job shadowing, internships and studio work all belong here.</EmptyState>
        : (
          <div className={styles.list}>
            {items.map((it, i) => (
              <div key={i} className={styles.row} style={{ '--i': i }}>
                <div className={styles.rowMain}>
                  <strong className={styles.rowTitle}>{it.role}</strong>
                  <span className={styles.rowMeta}>{it.company}{it.period ? ` · ${it.period}` : ''}</span>
                </div>
                <div className={styles.rowActions}>
                  <IconAction label={`Edit "${it.role}"`} onClick={() => openEdit(i)}><IconPencil size={15} /></IconAction>
                  <IconAction label={`Delete "${it.role}"`} danger onClick={() => remove(i)}><IconTrash size={15} /></IconAction>
                </div>
              </div>
            ))}
          </div>
        )}

      <Modal open={!!modal} onClose={close} title={modal?.mode === 'add' ? 'Add experience' : 'Edit experience'}>
        <form onSubmit={save}>
          <div className={styles.grid2}>
            <div className={styles.field}><label htmlFor="ex-co">Company / organisation *</label><input id="ex-co" value={form.company} onChange={set('company')} placeholder="Klad Studios Architecture" /></div>
            <div className={styles.field}><label htmlFor="ex-role">Role / position *</label><input id="ex-role" value={form.role} onChange={set('role')} placeholder="Job Shadow" /></div>
            <div className={cx(styles.field, styles.span2)}><label htmlFor="ex-per">Period</label><input id="ex-per" value={form.period} onChange={set('period')} placeholder="2023" /></div>
            <div className={cx(styles.field, styles.span2)}><label htmlFor="ex-desc">Description</label><textarea id="ex-desc" rows={3} value={form.description} onChange={set('description')} placeholder="Brief description…" /></div>
            <div className={cx(styles.field, styles.span2)}>
              <label htmlFor="ex-link">Website link (optional)</label>
              <input id="ex-link" value={form.link} onChange={set('link')} placeholder="lientjiepetsitting.co.za" />
              <p className={styles.hint}>
                Shown as a clickable link under the entry on the About page.
                You can leave off the “https://” - it is added for you.
              </p>
            </div>
          </div>
          <div className={styles.formActions}>
            <Button size="sm" magnetic={false} onClick={close}>Cancel</Button>
            <Button variant="accent" size="sm" magnetic={false} type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
