import { useState, useEffect } from 'react'
import { getContent, saveContentGroup } from '../../../../firebase'
import { CONTACT_INFO_FIELDS, resolveGroup } from '../../../../content/siteCopy'
import { useToast } from '../../../../context/ToastContext'
import { SectionHeader, SaveBar, useDirty } from '../../ui'
import styles from '../../Admin.module.css'

export default function ContactInfoSection() {
  const { addToast } = useToast()
  const [draft, setDraft] = useState(() => resolveGroup(CONTACT_INFO_FIELDS, {}))
  const [saving, setSaving] = useState(false)
  const [dirty, markClean] = useDirty(draft)

  useEffect(() => {
    getContent().then(data => {
      const next = resolveGroup(CONTACT_INFO_FIELDS, data?.contact)
      setDraft(next)
      markClean(next)
    })
  }, [markClean])

  const set = (key) => (e) => setDraft(d => ({ ...d, [key]: e.target.value }))

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const overrides = {}
    for (const f of CONTACT_INFO_FIELDS) {
      const val = (draft[f.key] ?? '').trim()
      if (val !== '' && val !== f.default) overrides[f.key] = val
    }
    try {
      await saveContentGroup('contact', overrides)
      markClean(draft)
      addToast({ type: 'success', title: 'Contact details saved' })
    } catch { addToast({ type: 'error', title: 'Save failed' }) }
    finally { setSaving(false) }
  }

  return (
    <div>
      <SectionHeader
        description={
          <p>
            The single source of truth for your contact details, shown on the Contact page,
            the About page and the footer. Leave a field blank to hide it or use the default.
          </p>
        }
      />
      <form onSubmit={handleSave}>
        <div className={styles.formCard}>
          <p className={styles.cardLabel}>Details</p>
          <div className={styles.grid2}>
            {CONTACT_INFO_FIELDS.map(f => (
              <div key={f.key} className={styles.field}>
                <label htmlFor={`ci-${f.key}`}>{f.label}</label>
                <input id={`ci-${f.key}`} value={draft[f.key] ?? ''} onChange={set(f.key)} placeholder={f.default || '-'} />
              </div>
            ))}
          </div>
        </div>
        <SaveBar dirty={dirty} saving={saving} label="Save contact details" />
      </form>
    </div>
  )
}
