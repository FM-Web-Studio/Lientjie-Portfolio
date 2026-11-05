import { useEffect, useRef, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { Close } from '../Icons'
import styles from './Modal.module.css'

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(', ')

const EXIT_MS = 320
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Admin dialog. Springs open, eases closed, traps focus, closes on Escape and restores focus.
// The global `admin-modal` class lets admin form styles reach content in this portal.
export default function Modal({ open, onClose, children, title, size = 'md' }) {
  const dialogRef = useRef(null)
  const prevFocusRef = useRef(null)
  // Stays mounted through the exit animation; the last title is kept so it does not flip while closing.
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)
  const lastTitle = useRef(title)
  if (open && title) lastTitle.current = title

  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); return undefined }
    if (!mounted) return undefined
    if (reduced()) { setMounted(false); return undefined }
    setClosing(true)
    const t = setTimeout(() => { setMounted(false); setClosing(false) }, EXIT_MS)
    return () => clearTimeout(t)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined
    prevFocusRef.current = document.activeElement

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${scrollbarWidth}px`

    const raf = requestAnimationFrame(() => dialogRef.current?.focus())
    return () => {
      cancelAnimationFrame(raf)
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
      prevFocusRef.current?.focus?.()
    }
  }, [open])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return }
    if (e.key === 'Tab' && dialogRef.current) {
      const nodes = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE))
      if (!nodes.length) { e.preventDefault(); return }
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  }, [onClose])

  if (!mounted) return null
  const shownTitle = open ? title : lastTitle.current

  return createPortal(
    <div
      className={`${styles.backdrop} ${closing ? styles.closing : ''}`}
      onMouseDown={(e) => { if (e.target === e.currentTarget && open) onClose() }}
    >
      <div
        ref={dialogRef}
        className={`admin-modal ${styles.dialog} ${size === 'lg' ? styles.dialogLg : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={shownTitle ? 'admin-modal-title' : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        inert={closing ? '' : undefined}
      >
        <span className={styles.handle} aria-hidden="true" />
        <header className={styles.header}>
          {shownTitle && <h2 id="admin-modal-title" className={styles.title}><span>{shownTitle}</span></h2>}
          <button className={styles.close} onClick={onClose} type="button" aria-label="Close">
            <Close size={16} />
          </button>
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
