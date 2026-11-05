import { useEffect } from 'react'
import { gsap, finePointer, reducedMotion } from '../lib/motion'

// Tilts an element toward the pointer in 3D and moves a soft glare with it.
// Writes --gx/--gy (glare position, %) for CSS to use. max is the tilt in degrees.
export default function useTilt(ref, max = 6) {
  useEffect(() => {
    const el = ref?.current
    if (!el || !finePointer() || reducedMotion()) return undefined
    gsap.set(el, { transformPerspective: 900 })
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3.out' })
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3.out' })

    const move = (e) => {
      const r = el.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width
      const py = (e.clientY - r.top) / r.height
      ry((px - 0.5) * max * 2)
      rx((0.5 - py) * max * 2)
      el.style.setProperty('--gx', `${px * 100}%`)
      el.style.setProperty('--gy', `${py * 100}%`)
    }
    const leave = () => { rx(0); ry(0) }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [ref, max])
}
