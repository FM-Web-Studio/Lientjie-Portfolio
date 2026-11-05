import { createContext, forwardRef, useContext, useEffect, useState, useCallback } from 'react'
import Button from '../../components/Button'
import { Plus } from '../../components/Icons'
import { IconUpload } from './icons'
import styles from './Admin.module.css'

export const cx = (...c) => c.filter(Boolean).join(' ')

// The shell tells each section its title and group, so sections only supply copy and actions.
export const SectionContext = createContext({ title: '', group: '' })

export function SectionHeader({ description, action, children }) {
  const { title, group } = useContext(SectionContext)
  return (
    <header className={styles.head}>
      <div className={styles.headRow}>
        <div className={styles.headText}>
          <p className={cx('eyebrow', styles.headMeta)}>{group}</p>
          <h1 className={styles.headTitle}>{title}</h1>
        </div>
        {action && <div className={styles.headAction}>{action}</div>}
      </div>
      {description && <div className={styles.headDesc}>{description}</div>}
      {children}
    </header>
  )
}

// Compares a value with the last loaded or saved snapshot. Only drives the save bar, never what is saved.
export function useDirty(value) {
  const [base, setBase] = useState(null)
  const markClean = useCallback((v) => setBase(JSON.stringify(v)), [])
  const dirty = base !== null && JSON.stringify(value) !== base
  return [dirty, markClean]
}

export function useMediaQuery(query) {
  const get = () => typeof window !== 'undefined' && window.matchMedia(query).matches
  const [match, setMatch] = useState(get)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

// Sticky at the foot of a form: quiet when clean, lifts and glows once something has changed.
export function SaveBar({ dirty, saving, label, onSave, children }) {
  const state = saving ? 'Saving changes' : dirty ? 'Unsaved changes' : 'All changes saved'
  return (
    <div className={cx(styles.saveBar, dirty && styles.saveBarDirty)}>
      <span className={styles.saveState} aria-live="polite">
        <span className={styles.saveDot} aria-hidden="true" />{state}
      </span>
      <div className={styles.saveActions}>
        {children}
        <Button
          variant="accent"
          size="sm"
          magnetic={false}
          type={onSave ? 'button' : 'submit'}
          onClick={onSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : label}
        </Button>
      </div>
    </div>
  )
}

// A drop-zone tile around a real (visually hidden, still focusable) file input.
// Hands the section's upload handler an event-shaped object, so upload calls stay unchanged.
export const DropZone = forwardRef(function DropZone(
  { multiple = false, busy = false, onFiles, title, hint, compact = false }, ref,
) {
  const [over, setOver] = useState(false)
  const [pending, setPending] = useState(0)

  useEffect(() => { if (!busy) setPending(0) }, [busy])

  const hand = (list) => {
    let files = Array.from(list || []).filter(f => !f.type || f.type.startsWith('image/'))
    if (!multiple) files = files.slice(0, 1)
    if (!files.length) return
    setPending(files.length)
    onFiles({ target: { files, type: 'file' } })
  }

  return (
    <label
      className={cx(styles.drop, compact && styles.dropCompact, over && styles.dropOver, busy && styles.dropBusy)}
      onDragEnter={(e) => { e.preventDefault(); if (!busy) setOver(true) }}
      onDragOver={(e) => { e.preventDefault() }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false) }}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (!busy) hand(e.dataTransfer.files) }}
    >
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="visually-hidden"
        disabled={busy}
        onChange={(e) => { hand(e.target.files); e.target.value = '' }}
      />
      <span className={styles.dropIcon} aria-hidden="true"><IconUpload size={18} /></span>
      <span className={styles.dropText}>
        <span className={styles.dropTitle}>
          {busy ? `Uploading ${pending > 1 ? `${pending} images` : 'image'}…` : title}
        </span>
        <span className={styles.dropHint}>
          {busy ? 'Large photos are resized before upload.' : hint ?? 'Drop here or click to browse'}
        </span>
      </span>
      <span className={styles.dropProgress} aria-hidden="true"><span /></span>
    </label>
  )
})

export function EmptyState({ title, children, action, icon }) {
  return (
    <div className={cx('card', styles.empty)}>
      <span className={styles.emptyIcon} aria-hidden="true">{icon ?? <Plus size={20} />}</span>
      <p className={styles.emptyTitle}>{title}</p>
      {children && <p className={styles.emptyText}>{children}</p>}
      {action}
    </div>
  )
}

export function SkeletonRows({ rows = 4, thumb = false }) {
  return (
    <div className={styles.skelList} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={cx('card', styles.skelRow)} style={{ '--i': i }}>
          {thumb && <span className={cx('skeleton', styles.skelThumb)} />}
          <span className={styles.skelText}>
            <span className={cx('skeleton', styles.skelLine)} style={{ width: `${56 - i * 6}%` }} />
            <span className={cx('skeleton', styles.skelLine, styles.skelLineSm)} style={{ width: `${32 - i * 3}%` }} />
          </span>
          <span className={cx('skeleton', styles.skelAct)} />
        </div>
      ))}
    </div>
  )
}

// Status pills reuse the site's .badge; tone only tints it.
export function Pill({ tone = 'neutral', children }) {
  return <span className={cx('badge', styles.pill, styles[`pill_${tone}`])}>{children}</span>
}

// Compact icon action for list rows. Keeps a visible label for assistive tech via aria-label and a tooltip.
export function IconAction({ label, danger, className, children, ...rest }) {
  return (
    <button
      type="button"
      className={cx(styles.iconAct, danger && styles.iconActDanger, className)}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  )
}
