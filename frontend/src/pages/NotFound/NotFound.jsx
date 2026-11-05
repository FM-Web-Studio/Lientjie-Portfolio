import { useRef } from 'react'
import { Button, ArrowRight, ArrowUpRight } from '../../components'
import { gsap, useGSAP, reducedMotion, finePointer, afterCurtain } from '../../lib/motion'
import styles from './NotFound.module.css'

// How far each digit drifts toward the pointer, in px at the edge of the screen.
const DEPTH = [10, 16, 10]

export default function NotFound() {
  const root = useRef(null)

  useGSAP(() => {
    if (reducedMotion()) return undefined
    const digits = gsap.utils.toArray('[data-digit]', root.current)
    const pupil = root.current.querySelector('[data-pupil]')

    gsap.set(digits, { yPercent: 60, opacity: 0, rotate: i => (i - 1) * 12 })
    const stop = afterCurtain(() => {
      gsap.to(digits, { yPercent: 0, opacity: 1, rotate: 0, duration: 1.2, stagger: 0.08, ease: 'back.out(2)' })
    })

    // A tap or click makes the digits hop, one after the other.
    const hop = () => gsap.fromTo(digits, { y: 0 }, {
      keyframes: [{ y: -22, duration: 0.22, ease: 'power2.out' }, { y: 0, duration: 0.6, ease: 'bounce.out' }],
      stagger: 0.06,
      overwrite: 'auto',
    })
    const zone = root.current.querySelector('[data-digits]')
    zone.addEventListener('click', hop)

    if (!finePointer()) return () => { stop(); zone.removeEventListener('click', hop) }

    const movers = digits.map((d, i) => ({
      x: gsap.quickTo(d, 'x', { duration: 0.9, ease: 'power3.out' }),
      depth: DEPTH[i] ?? 10,
    }))
    const px = gsap.quickTo(pupil, 'xPercent', { duration: 0.5, ease: 'power3.out' })
    const py = gsap.quickTo(pupil, 'yPercent', { duration: 0.5, ease: 'power3.out' })

    // The zero keeps an eye on the pointer; the fours lean a little toward it.
    const move = (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      movers.forEach(m => m.x(nx * m.depth))
      const r = zone.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      const len = Math.hypot(dx, dy) || 1
      const reach = Math.min(1, len / 240)
      px((dx / len) * reach * 90)
      py((dy / len) * reach * 120)
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => {
      stop()
      zone.removeEventListener('click', hop)
      window.removeEventListener('pointermove', move)
    }
  }, { scope: root })

  return (
    <section ref={root} className={`container ${styles.page}`}>
      <span className="badge badge-dot">Error 404</span>

      <p className={styles.digits} data-digits="" aria-hidden="true">
        <span data-digit="" className={styles.digit}>4</span>
        <span data-digit="" className={`${styles.digit} ${styles.zero}`}>
          <span className={styles.eye}><span data-pupil="" className={styles.pupil} /></span>
        </span>
        <span data-digit="" className={styles.digit}>4</span>
      </p>

      <h1 className={styles.title}>Not found<span className="dot">.</span></h1>
      <p className={styles.text}>
        This page has been moved, renamed, or never drawn. The work is all still here.
      </p>
      <div className={styles.actions}>
        <Button to="/" variant="accent" icon={<ArrowRight size={15} />}>Back to index</Button>
        <Button to="/work" icon={<ArrowUpRight size={15} />}>View work</Button>
      </div>
    </section>
  )
}
