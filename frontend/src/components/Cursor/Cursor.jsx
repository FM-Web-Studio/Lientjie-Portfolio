import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { gsap, finePointer, reducedMotion } from '../../lib/motion'
import styles from './Cursor.module.css'

const LABELS = { view: 'View', drag: 'Drag', open: 'Open', play: 'Play', next: 'Next', close: 'Close', mail: 'Write' }

/**
 * A dot that tracks the pointer exactly and a ring that trails it.
 * Hover targets opt in with data-cursor: "view" | "drag" | "open" | ... grows a labelled disc,
 * "hide" tucks the cursor away (buttons with their own effect). Links and buttons grow the ring.
 * data-cursor-label overrides the text.
 */
export default function Cursor() {
  const [on] = useState(() => typeof window !== 'undefined' && finePointer() && !reducedMotion())
  const dot = useRef(null)
  const ring = useRef(null)
  const [state, setState] = useState({ mode: 'idle', label: '' })
  const { pathname } = useLocation()

  useEffect(() => { setState({ mode: 'idle', label: '' }) }, [pathname])

  useEffect(() => {
    if (!on) return undefined
    document.documentElement.classList.add('has-cursor')
    const dx = gsap.quickTo(dot.current, 'x', { duration: 0.12, ease: 'power3.out' })
    const dy = gsap.quickTo(dot.current, 'y', { duration: 0.12, ease: 'power3.out' })
    const rx = gsap.quickTo(ring.current, 'x', { duration: 0.55, ease: 'power3.out' })
    const ry = gsap.quickTo(ring.current, 'y', { duration: 0.55, ease: 'power3.out' })
    let shown = false

    const move = (e) => {
      if (!shown) {
        shown = true
        gsap.set([dot.current, ring.current], { x: e.clientX, y: e.clientY })
        gsap.to([dot.current, ring.current], { autoAlpha: 1, duration: 0.3 })
      }
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY)
    }
    const over = (e) => {
      const target = e.target.closest?.('[data-cursor], a, button, label, [role="button"], input, textarea, select')
      if (!target) { setState({ mode: 'idle', label: '' }); return }
      if (target.matches('input, textarea, select')) { setState({ mode: 'text', label: '' }); return }
      const kind = target.getAttribute('data-cursor')
      if (kind === 'hide') { setState({ mode: 'hide', label: '' }); return }
      if (kind) { setState({ mode: 'label', label: target.getAttribute('data-cursor-label') || LABELS[kind] || kind }); return }
      setState({ mode: 'link', label: '' })
    }
    const leaveWindow = () => { shown = false; gsap.to([dot.current, ring.current], { autoAlpha: 0, duration: 0.3 }) }
    const down = () => ring.current?.classList.add(styles.press)
    const up = () => ring.current?.classList.remove(styles.press)

    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerover', over, { passive: true })
    document.documentElement.addEventListener('pointerleave', leaveWindow)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    return () => {
      document.documentElement.classList.remove('has-cursor')
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerover', over)
      document.documentElement.removeEventListener('pointerleave', leaveWindow)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
    }
  }, [on])

  if (!on) return null
  return (
    <div className={styles.root} data-mode={state.mode} aria-hidden="true">
      <span ref={ring} className={styles.ring}>
        <span className={styles.disc}><span className={styles.label}>{state.label}</span></span>
      </span>
      <span ref={dot} className={styles.dot} />
    </div>
  )
}
