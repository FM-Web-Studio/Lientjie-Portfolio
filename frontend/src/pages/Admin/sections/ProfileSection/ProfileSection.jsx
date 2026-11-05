import { useState, useEffect, useRef } from 'react'
import { getBioProfile, updateBioSection, uploadFile, pruneUnusedImages } from '../../../../firebase'
import { useToast } from '../../../../context/ToastContext'
import Button from '../../../../components/Button'
import { SectionHeader, SaveBar, DropZone, useDirty, cx } from '../../ui'
import { IconTrash } from '../../icons'
import styles from '../../Admin.module.css'

const BLANK = { name: '', title: '', subtitle: '', bio: '', profileImage: '' }

export default function ProfileSection() {
  const { addToast } = useToast()
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dirty, markClean] = useDirty(form)
  const fileRef = useRef()
  // The image Firestore currently holds, so a replaced one can be cleaned up.
  const savedImage = useRef('')

  useEffect(() => {
    getBioProfile().then(p => {
      if (!p) { markClean(BLANK); return }
      const next = { ...BLANK, ...p }
      setForm(next)
      markClean(next)
      savedImage.current = p.profileImage || ''
    })
  }, [markClean])

  const set = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.value }))

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const previous = savedImage.current
    try {
      await updateBioSection('profile', form)
      savedImage.current = form.profileImage || ''
      markClean(form)
      addToast({ type: 'success', title: 'Profile saved' })
      await pruneUnusedImages([previous])
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
      <SectionHeader
        description={<>
          <p>
            Your name, title and bio as shown on the <strong>About</strong> page. Email,
            phone, location and social links live under <strong>Contact Info</strong>.
          </p>
          {/* Profile is the obvious place to change the big home page name, and the wrong one. */}
          <p className={styles.note}>
            <span>
              Changing the large name on the <strong>home page</strong>? That one lives under{' '}
              <strong>Site Copy → Home → &ldquo;Big name on home page&rdquo;</strong>.
            </span>
          </p>
        </>}
      />
      <form onSubmit={handleSave}>
        <div className={styles.formCard}>
          <p className={styles.cardLabel}>Identity</p>
          <div className={styles.grid2}>
            <div className={styles.field}><label htmlFor="pr-name">Full name</label><input id="pr-name" value={form.name} onChange={set('name')} placeholder="Lientjie Meiring" /></div>
            <div className={styles.field}><label htmlFor="pr-title">Title</label><input id="pr-title" value={form.title} onChange={set('title')} placeholder="Architecture Student" /></div>
            <div className={cx(styles.field, styles.span2)}><label htmlFor="pr-sub">Subtitle</label><input id="pr-sub" value={form.subtitle} onChange={set('subtitle')} placeholder="Aspiring Architect & Design Enthusiast" /></div>
            <div className={cx(styles.field, styles.span2)}><label htmlFor="pr-bio">Bio</label><textarea id="pr-bio" rows={6} value={form.bio} onChange={set('bio')} placeholder="Short professional bio shown on the About page…" /></div>
          </div>
        </div>

        <div className={styles.formCard}>
          <p className={styles.cardLabel}>Portrait</p>
          <div className={styles.imgField}>
            <div className={styles.preview}>
              {form.profileImage
                ? <img key={form.profileImage} src={form.profileImage} alt="Profile" decoding="async" onError={e => { e.currentTarget.style.display = 'none' }} />
                : <span className={styles.previewEmpty}>No portrait</span>}
            </div>
            <div className={styles.imgSide}>
              <DropZone
                ref={fileRef}
                busy={uploading}
                onFiles={handleImage}
                title={form.profileImage ? 'Replace portrait' : 'Upload a portrait'}
              />
              {form.profileImage && (
                <div className={styles.imgRow}>
                  <Button
                    size="sm"
                    magnetic={false}
                    className={cx(styles.danger, styles.noNudge)}
                    icon={<IconTrash size={15} />}
                    onClick={() => setForm(f => ({ ...f, profileImage: '' }))}
                  >
                    Remove image
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <SaveBar dirty={dirty} saving={saving} label="Save profile" />
      </form>
    </div>
  )
}
