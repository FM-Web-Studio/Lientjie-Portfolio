import { useState, useEffect } from 'react'
import { getBioSection, updateBioSection } from '../../../../firebase'
import { useToast } from '../../../../context/ToastContext'
import Modal from '../../../../components/Modal'
import Button from '../../../../components/Button'
import { Plus } from '../../../../components/Icons'
import { SectionHeader, EmptyState, SkeletonRows, IconAction, cx } from '../../ui'
import { IconPencil, IconTrash } from '../../icons'
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

  const addButton = <Button variant="accent" size="sm" magnetic={false} icon={<Plus size={14} />} onClick={openAdd}>Add entry</Button>

  return (
    <div>
      <SectionHeader description={<p>Education timeline shown on the About page.</p>} action={addButton} />

      {loading ? <SkeletonRows rows={3} />
        : items.length === 0 ? <EmptyState title="No education yet">Add a degree or course and it appears on the About page timeline.</EmptyState>
        : (
          <div className={styles.list}>
            {items.map((it, i) => (
              <div key={i} className={styles.row} style={{ '--i': i }}>
                <div className={styles.rowMain}>
                  <strong className={styles.rowTitle}>{it.degree}</strong>
                  <span className={styles.rowMeta}>{it.institution}{it.period ? ` · ${it.period}` : ''}</span>
                </div>
                <div className={styles.rowActions}>
                  <IconAction label={`Edit "${it.degree}"`} onClick={() => openEdit(i)}><IconPencil size={15} /></IconAction>
                  <IconAction label={`Delete "${it.degree}"`} danger onClick={() => remove(i)}><IconTrash size={15} /></IconAction>
                </div>
              </div>
            ))}
          </div>
        )}

      <Modal open={!!modal} onClose={close} title={modal?.mode === 'add' ? 'Add education' : 'Edit education'}>
        <form onSubmit={save}>
          <div className={styles.grid2}>
            <div className={styles.field}><label htmlFor="ed-inst">Institution *</label><input id="ed-inst" value={form.institution} onChange={set('institution')} placeholder="University of Johannesburg" /></div>
            <div className={styles.field}><label htmlFor="ed-deg">Degree / qualification *</label><input id="ed-deg" value={form.degree} onChange={set('degree')} placeholder="Bachelor of Architecture" /></div>
            <div className={cx(styles.field, styles.span2)}><label htmlFor="ed-per">Period</label><input id="ed-per" value={form.period} onChange={set('period')} placeholder="2023 - Present" /></div>
            <div className={cx(styles.field, styles.span2)}><label htmlFor="ed-desc">Description</label><textarea id="ed-desc" rows={3} value={form.description} onChange={set('description')} placeholder="Brief description…" /></div>
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
