import { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger, reducedMotion, finePointer } from '../../lib/motion'
import styles from './Ambient.module.css'

const BLOBS = ['mint', 'lavender', 'coral', 'sky', 'peach']

/**
 * Soft colour light behind every page. The glows drift on their own, slide at different
 * speeds as the page scrolls and lean toward the pointer, which gives the flat page depth.
 */
export default function Ambient() {
  const root = useRef(null)

  useEffect(() => {
    if (reducedMotion() || !root.current) return undefined
    const blobs = [...root.current.children]
    const ctx = gsap.context(() => {
      blobs.forEach((el, i) => {
        gsap.to(el, {
          yPercent: (i % 2 ? -1 : 1) * (30 + i * 12),
          ease: 'none',
          scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1.5 },
        })
      })
    }, root)

    let off = () => {}
    if (finePointer()) {
      const movers = blobs.map((el, i) => ({
        x: gsap.quickTo(el, 'x', { duration: 2.4 + i * 0.4, ease: 'power3.out' }),
        y: gsap.quickTo(el, 'y', { duration: 2.4 + i * 0.4, ease: 'power3.out' }),
        k: (i + 1) * 14,
      }))
      const move = (e) => {
        const dx = e.clientX / window.innerWidth - 0.5
        const dy = e.clientY / window.innerHeight - 0.5
        movers.forEach(m => { m.x(dx * m.k * 3); m.y(dy * m.k * 2) })
      }
      window.addEventListener('pointermove', move, { passive: true })
      off = () => window.removeEventListener('pointermove', move)
    }
    const refresh = setTimeout(() => ScrollTrigger.refresh(), 500)
    return () => { off(); clearTimeout(refresh); ctx.revert() }
  }, [])

  return (
    <div ref={root} className={styles.ambient} aria-hidden="true">
      {BLOBS.map(b => <span key={b} className={`${styles.blob} ${styles[b]}`} />)}
    </div>
  )
}
