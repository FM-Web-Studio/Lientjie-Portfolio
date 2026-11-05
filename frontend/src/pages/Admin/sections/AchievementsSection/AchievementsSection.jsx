import { useState, useEffect } from 'react'
import { getBioSection, updateBioSection } from '../../../../firebase'
import { useToast } from '../../../../context/ToastContext'
import Modal from '../../../../components/Modal'
import Button from '../../../../components/Button'
import { Plus } from '../../../../components/Icons'
import { SectionHeader, EmptyState, SkeletonRows, IconAction, cx } from '../../ui'
import { IconPencil, IconTrash, IconChevUp, IconChevDown } from '../../icons'
import styles from '../../Admin.module.css'

const BLANK = { title: '', issuer: '', period: '', description: '', link: '' }

// Stored as portfolio_bio/achievements with the same { items } shape as Education, so no new rule is needed.
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

  // Ordered by hand: a first-year prize may still belong at the top.
  async function move(i, delta) {
    const j = i + delta
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    await persist(next)
  }

  const addButton = <Button variant="accent" size="sm" magnetic={false} icon={<Plus size={14} />} onClick={openAdd}>Add achievement</Button>

  return (
    <div>
      <SectionHeader
        description={
          <p>
            Awards, competitions, publications and certifications. Shown on the About
            page between Experience and Skills; the section is hidden while this list
            is empty.
          </p>
        }
        action={addButton}
      />

      {loading ? <SkeletonRows rows={3} />
        : items.length === 0 ? <EmptyState title="No achievements yet">Add your first one with the button above.</EmptyState>
        : (
          <div className={styles.list}>
            {items.map((it, i) => (
              <div key={i} className={cx(styles.row, styles.rowWithHandle)} style={{ '--i': i }}>
                <div className={styles.reorder} role="group" aria-label={`Reorder "${it.title}"`}>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move "${it.title}" up`}>
                    <IconChevUp size={14} />
                  </button>
                  <span className={styles.grip} aria-hidden="true" />
                  <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Move "${it.title}" down`}>
                    <IconChevDown size={14} />
                  </button>
                </div>
                <div className={styles.rowMain}>
                  <strong className={styles.rowTitle}>{it.title}</strong>
                  <span className={styles.rowMeta}>{[it.issuer, it.period].filter(Boolean).join(' · ')}</span>
                </div>
                <div className={styles.rowActions}>
                  <IconAction label={`Edit "${it.title}"`} onClick={() => openEdit(i)}><IconPencil size={15} /></IconAction>
                  <IconAction label={`Delete "${it.title}"`} danger onClick={() => remove(i)}><IconTrash size={15} /></IconAction>
                </div>
              </div>
            ))}
          </div>
        )}

      <Modal open={!!modal} onClose={close} title={modal?.mode === 'add' ? 'Add achievement' : 'Edit achievement'}>
        <form onSubmit={save}>
          <div className={styles.grid2}>
            <div className={cx(styles.field, styles.span2)}>
              <label htmlFor="ac-title">Title *</label>
              <input id="ac-title" value={form.title} onChange={set('title')} placeholder="Dean's Merit List" />
            </div>
            <div className={styles.field}>
              <label htmlFor="ac-issuer">Awarded by</label>
              <input id="ac-issuer" value={form.issuer} onChange={set('issuer')} placeholder="University of Pretoria" />
            </div>
            <div className={styles.field}>
              <label htmlFor="ac-period">Year / period</label>
              <input id="ac-period" value={form.period} onChange={set('period')} placeholder="2025" />
            </div>
            <div className={cx(styles.field, styles.span2)}>
              <label htmlFor="ac-desc">Description</label>
              <textarea id="ac-desc" rows={3} value={form.description} onChange={set('description')} placeholder="Brief description…" />
            </div>
            <div className={cx(styles.field, styles.span2)}>
              <label htmlFor="ac-link">Link (optional)</label>
              <input id="ac-link" value={form.link} onChange={set('link')} placeholder="example.co.za/award" />
              <p className={styles.hint}>You can leave off the “https://” - it is added for you.</p>
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
