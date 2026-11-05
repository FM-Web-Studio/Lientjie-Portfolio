import { useEffect } from 'react'
import { gsap, finePointer, reducedMotion } from '../lib/motion'

// Pulls an element toward the pointer while it hovers, then lets it spring back.
// `strength` is the share of the pointer's offset the element follows.
export default function useMagnetic(ref, strength = 0.35, inner = null) {
  useEffect(() => {
    const el = ref?.current
    if (!el || !finePointer() || reducedMotion()) return undefined

    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' })
    const child = inner?.current
    const cxTo = child && gsap.quickTo(child, 'x', { duration: 0.6, ease: 'power3.out' })
    const cyTo = child && gsap.quickTo(child, 'y', { duration: 0.6, ease: 'power3.out' })

    const move = (e) => {
      const r = el.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      xTo(dx * strength)
      yTo(dy * strength)
      if (child) { cxTo(dx * strength * 0.5); cyTo(dy * strength * 0.5) }
    }
    const leave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.35)' })
      if (child) gsap.to(child, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.35)' })
    }

    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
      gsap.killTweensOf(el)
    }
  }, [ref, strength, inner])
}
