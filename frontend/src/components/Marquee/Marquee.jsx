import { useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP, reducedMotion } from '../../lib/motion'
import styles from './Marquee.module.css'

/**
 * An endless band. It runs on its own, speeds up with the scroll and follows its direction.
 * duration is seconds for one full loop at rest. reverse starts it running to the right.
 */
export default function Marquee({ children, duration = 30, reverse = false, className = '', separator = null }) {
  const ref = useRef(null)
  const track = useRef(null)

  useGSAP(() => {
    if (reducedMotion() || !track.current) return
    const base = reverse ? -1 : 1
    const loop = gsap.fromTo(track.current, { xPercent: reverse ? -50 : 0 }, { xPercent: reverse ? 0 : -50, duration, ease: 'none', repeat: -1 })
    let dir = base
    ScrollTrigger.create({
      trigger: ref.current,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate(self) {
        dir = self.direction === 1 ? base : -base
        const boost = Math.min(Math.abs(self.getVelocity()) / 220, 6)
        gsap.to(loop, { timeScale: dir * (1 + boost), duration: 0.25, overwrite: true })
        gsap.to(loop, { timeScale: dir, duration: 1.2, delay: 0.25, overwrite: false })
      },
    })
  }, { scope: ref, dependencies: [duration, reverse] })

  const run = (hidden) => (
    <div className={styles.run} aria-hidden={hidden || undefined}>
      {[0, 1].map(i => (
        <span key={i} className={styles.item}>{children}{separator}</span>
      ))}
    </div>
  )

  return (
    <div ref={ref} className={`${styles.marquee} ${className}`}>
      <div ref={track} className={styles.track}>
        {run(false)}
        {run(true)}
      </div>
    </div>
  )
}
