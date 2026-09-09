import { useState, useEffect, useRef } from 'react'
import { getBioProfile, updateBioSection, uploadFile } from '../../../firebase'
import { useToast } from '../../../context/ToastContext'
import styles from '../Admin.module.css'

const BLANK = { name: '', title: '', subtitle: '', bio: '', profileImage: '' }

export default function ProfileSection() {
  const { addToast } = useToast()
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    getBioProfile().then(p => { if (p) setForm({ ...BLANK, ...p }) })
  }, [])

  const set = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.value }))

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateBioSection('profile', form)
      addToast({ type: 'success', title: 'Profile saved' })
    } catch { addToast({ type: 'error', title: 'Save failed' }) }
    finally { setSaving(false) }
  }

  async function handleImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFile(file, 'portfolio/profile')
      setForm(f => ({ ...f, profileImage: url }))
      addToast({ type: 'success', title: 'Image uploaded' })
    } catch { addToast({ type: 'error', title: 'Upload failed' }) }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  return (
    <div>
      <p className={styles.intro}>
        Your name, title and bio as shown on the <strong>About</strong> page. Email,
        phone, location and social links live under <strong>Contact Info</strong>.
      </p>
      {/* The big name on the home page is NOT this field. It is split across two
          typographic halves (italic first name, roman last name) and lives in
          Site Copy. Saying so here is the whole fix for "I changed my name and
          nothing happened": Profile is the obvious place to look, and it is the
          wrong one. */}
      <p className={styles.intro}>
        Changing the large name on the <strong>home page</strong>? That one lives under{' '}
        <strong>Site Copy → Home → &ldquo;Hero - first name&rdquo; / &ldquo;Hero - last name&rdquo;</strong>.
      </p>
      <form className={styles.formCard} onSubmit={handleSave}>
        <div className={styles.grid2}>
          <div className={styles.field}><label>Full Name</label><input value={form.name} onChange={set('name')} placeholder="Lientjie Meiring" /></div>
          <div className={styles.field}><label>Title</label><input value={form.title} onChange={set('title')} placeholder="Architecture Student" /></div>
          <div className={`${styles.field} ${styles.span2}`}><label>Subtitle</label><input value={form.subtitle} onChange={set('subtitle')} placeholder="Aspiring Architect & Design Enthusiast" /></div>
          <div className={`${styles.field} ${styles.span2}`}><label>Bio</label><textarea rows={5} value={form.bio} onChange={set('bio')} placeholder="Short professional bio shown on the About page…" /></div>
          <div className={`${styles.field} ${styles.span2}`}>
            <label>Profile Image</label>
            {form.profileImage
              ? <img src={form.profileImage} alt="Profile" className={styles.imgPreview} onError={e => { e.currentTarget.style.display = 'none' }} />
              : <p className={styles.uploadMsg}>No profile image yet.</p>}
            <div className={styles.imgRow}>
              <label className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm} ${styles.uploadBtn}`}>
                {uploading ? 'Uploading…' : form.profileImage ? 'Replace image' : 'Upload image'}
                <input type="file" accept="image/*" ref={fileRef} onChange={handleImage} hidden disabled={uploading} />
              </label>
              {form.profileImage && (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`}
                  onClick={() => setForm(f => ({ ...f, profileImage: '' }))}
                >
                  Remove image
                </button>
              )}
            </div>
          </div>
        </div>
        <div className={styles.formActions}>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>{saving ? 'Saving…' : 'Save Profile'}</button>
        </div>
      </form>
    </div>
  )
}
