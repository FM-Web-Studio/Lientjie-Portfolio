import { useState, useEffect } from 'react'
import { getBioSection, updateBioSection } from '../../../../firebase'
import { useToast } from '../../../../context/ToastContext'
import Button from '../../../../components/Button'
import { Plus } from '../../../../components/Icons'
import { SectionHeader, SaveBar, EmptyState, SkeletonRows, IconAction, useDirty, cx } from '../../ui'
import { IconTrash } from '../../icons'
import styles from '../../Admin.module.css'

export default function SkillsSection() {
  const { addToast } = useToast()
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, markClean] = useDirty(cats)

  useEffect(() => {
    getBioSection('skills').then(d => {
      const loaded = d?.categories ?? []
      setCats(loaded)
      markClean(loaded)
    }).finally(() => setLoading(false))
  }, [markClean])

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
      markClean(cats)
      addToast({ type: 'success', title: 'Skills saved' })
    } catch { addToast({ type: 'error', title: 'Save failed' }) }
    finally { setSaving(false) }
  }

  const addCategoryBtn = (
    <Button size="sm" magnetic={false} icon={<Plus size={14} />} onClick={addCategory}>Add category</Button>
  )

  return (
    <div>
      <SectionHeader
        description={<p>Skill categories and levels shown as animated bars on the About page.</p>}
        action={!loading && addCategoryBtn}
      />

      {loading ? <SkeletonRows rows={3} />
        : cats.length === 0 ? <EmptyState title="No skill categories">Start with something like Software or Hand skills.</EmptyState>
        : cats.map((cat, ci) => (
          <div key={ci} className={styles.skillCat} style={{ '--i': ci }}>
            <div className={styles.skillCatHead}>
              <div className={styles.field}>
                <label htmlFor={`sk-cat-${ci}`}>Category {ci + 1}</label>
                <input id={`sk-cat-${ci}`} className={styles.catName} value={cat.name} onChange={e => updateCatName(ci, e.target.value)} placeholder="Category name (e.g. Software)" />
              </div>
              <IconAction label={`Remove category ${cat.name || ci + 1}`} danger onClick={() => removeCategory(ci)}><IconTrash size={15} /></IconAction>
            </div>
            {(cat.items || []).map((sk, si) => (
              <div key={si} className={styles.skillRow}>
                <div className={styles.field}>
                  <input
                    type="text"
                    value={sk.label}
                    onChange={e => updateSkill(ci, si, 'label', e.target.value)}
                    placeholder="Skill name"
                    aria-label={`Skill ${si + 1} name`}
                  />
                </div>
                <div className={styles.levelWrap}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    className={styles.range}
                    style={{ '--val': `${sk.level}%` }}
                    value={sk.level}
                    onChange={e => updateSkill(ci, si, 'level', Number(e.target.value))}
                    aria-label={`${sk.label || `Skill ${si + 1}`} level`}
                  />
                  <span className={styles.levelVal}>{sk.level}%</span>
                </div>
                <IconAction label={`Remove ${sk.label || `skill ${si + 1}`}`} danger onClick={() => removeSkill(ci, si)}><IconTrash size={14} /></IconAction>
              </div>
            ))}
            <Button size="sm" magnetic={false} className={cx(styles.addSkill)} icon={<Plus size={14} />} onClick={() => addSkill(ci)}>Add skill</Button>
          </div>
        ))}

      {!loading && (
        <SaveBar dirty={dirty} saving={saving} label="Save skills" onSave={handleSave} />
      )}
    </div>
  )
}
