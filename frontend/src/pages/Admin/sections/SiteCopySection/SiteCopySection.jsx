import { useState, useEffect, useRef } from 'react'
import { getContent, saveContentGroup } from '../../../../firebase'
import { COPY_SCHEMA } from '../../../../content/siteCopy'
import { useToast } from '../../../../context/ToastContext'
import styles from '../../Admin.module.css'

const buildDraft = (saved = {}) => {
  const d = {}
  for (const group of COPY_SCHEMA) {
    d[group.key] = {}
    for (const f of group.fields) {
      const ov = saved?.[group.key]?.[f.key]
      d[group.key][f.key] = (typeof ov === 'string' && ov !== '') ? ov : f.default
    }
  }
  return d
}

const overridesFor = (group, draft) => {
  const g = {}
  for (const f of group.fields) {
    const val = (draft[group.key]?.[f.key] ?? '').trim()
    if (val !== '' && val !== f.default) g[f.key] = val
  }
  return g
}

export default function SiteCopySection() {
  const { addToast } = useToast()
  const [activeGroup, setActiveGroup] = useState(COPY_SCHEMA[0].key)
  const [draft, setDraft] = useState(() => buildDraft({}))
  const [saving, setSaving] = useState(false)
  const dirtyRef = useRef(false)

  useEffect(() => {
    getContent().then(data => { if (!dirtyRef.current) setDraft(buildDraft(data)) })
  }, [])

  const set = (groupKey, fieldKey, value) => {
    dirtyRef.current = true
    setDraft(prev => ({ ...prev, [groupKey]: { ...prev[groupKey], [fieldKey]: value } }))
  }
  const resetField = (groupKey, field) => set(groupKey, field.key, field.default)

  async function handleSave() {
    setSaving(true)
    try {
      for (const group of COPY_SCHEMA) {
        // eslint-disable-next-line no-await-in-loop
        await saveContentGroup(group.key, overridesFor(group, draft))
      }
      dirtyRef.current = false
      addToast({ type: 'success', title: 'Site copy updated' })
    } catch { addToast({ type: 'error', title: 'Save failed' }) }
    finally { setSaving(false) }
  }

  const group = COPY_SCHEMA.find(g => g.key === activeGroup) ?? COPY_SCHEMA[0]

  return (
    <div>
      <p className={styles.intro}>
        Edit the headings and wording shown across the site. Clear a field to restore its
        original text.
      </p>

      <nav className={styles.subTabs}>
        {COPY_SCHEMA.map(g => (
          <button key={g.key} type="button" className={`${styles.subTab} ${g.key === activeGroup ? styles.subTabActive : ''}`} onClick={() => setActiveGroup(g.key)}>
            {g.label}
          </button>
        ))}
      </nav>

      <div className={styles.formCard}>
        <div className={styles.grid2}>
          {group.fields.map(f => {
            const value = draft[group.key]?.[f.key] ?? ''
            const modified = value !== f.default
            const full = f.type === 'textarea'
            return (
              <div key={f.key} className={`${styles.field} ${full ? styles.span2 : ''}`}>
                <label htmlFor={`copy-${group.key}-${f.key}`}>
                  {f.label}
                  {modified && (
                    <button type="button" className={styles.resetBtn} onClick={() => resetField(group.key, f)} title="Reset to original">↺ reset</button>
                  )}
                </label>
                {full
                  ? <textarea id={`copy-${group.key}-${f.key}`} value={value} rows={3} onChange={e => set(group.key, f.key, e.target.value)} />
                  : <input id={`copy-${group.key}-${f.key}`} type="text" value={value} onChange={e => set(group.key, f.key, e.target.value)} />}
              </div>
            )
          })}
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Site Copy'}</button>
      </div>
    </div>
  )
}
