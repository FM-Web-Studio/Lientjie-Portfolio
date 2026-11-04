import { useState, useEffect } from 'react'
import { getBioSection, updateBioSection } from '../../../../firebase'
import { useToast } from '../../../../context/ToastContext'
import styles from '../../Admin.module.css'

export default function SkillsSection() {
  const { addToast } = useToast()
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getBioSection('skills').then(d => setCats(d?.categories ?? [])).finally(() => setLoading(false))
  }, [])

  const updateCatName = (ci, val) => setCats(prev => prev.map((c, i) => i === ci ? { ...c, name: val } : c))
  const addCategory = () => setCats(prev => [...prev, { name: '', items: [{ label: '', level: 70 }] }])
  const removeCategory = (ci) => { if (window.confirm('Delete this skill category?')) setCats(prev => prev.filter((_, i) => i !== ci)) }
  const addSkill = (ci) => setCats(prev => prev.map((c, i) => i === ci ? { ...c, items: [...(c.items || []), { label: '', level: 70 }] } : c))
  const removeSkill = (ci, si) => setCats(prev => prev.map((c, i) => i === ci ? { ...c, items: c.items.filter((_, j) => j !== si) } : c))
  const updateSkill = (ci, si, key, val) => setCats(prev => prev.map((c, i) => i === ci ? { ...c, items: c.items.map((sk, j) => j === si ? { ...sk, [key]: val } : sk) } : c))

  async function handleSave() {
    setSaving(true)
    try {
      await updateBioSection('skills', { categories: cats })
      addToast({ type: 'success', title: 'Skills saved' })
    } catch { addToast({ type: 'error', title: 'Save failed' }) }
    finally { setSaving(false) }
  }

  if (loading) return <p className={styles.empty}>Loading…</p>

  return (
    <div>
      <p className={styles.intro}>Skill categories and levels shown as animated bars on the About page.</p>

      {cats.map((cat, ci) => (
        <div key={ci} className={styles.skillCat}>
          <div className={styles.skillCatHead}>
            <div className={styles.field} style={{ flex: 1 }}>
              <input value={cat.name} onChange={e => updateCatName(ci, e.target.value)} placeholder="Category name (e.g. Software)" />
            </div>
            <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => removeCategory(ci)}>Remove</button>
          </div>
          {(cat.items || []).map((sk, si) => (
            <div key={si} className={styles.skillRow}>
              <input type="text" value={sk.label} onChange={e => updateSkill(ci, si, 'label', e.target.value)} placeholder="Skill name"
                style={{ padding: '0.5rem 0.7rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--background-1)', color: 'var(--primary-text-color)', fontFamily: 'var(--font-sans)' }} />
              <div className={styles.levelWrap}>
                <input type="range" min="0" max="100" step="5" value={sk.level} onChange={e => updateSkill(ci, si, 'level', Number(e.target.value))} />
                <span className={styles.levelVal}>{sk.level}%</span>
              </div>
              <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => removeSkill(ci, si)}>✕</button>
            </div>
          ))}
          <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} onClick={() => addSkill(ci)} style={{ marginTop: '0.5rem' }}>+ Add Skill</button>
        </div>
      ))}

      <div className={styles.formActions} style={{ justifyContent: 'space-between' }}>
        <button className={`${styles.btn} ${styles.btnOutline}`} onClick={addCategory}>+ Add Category</button>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Skills'}</button>
      </div>
    </div>
  )
}
