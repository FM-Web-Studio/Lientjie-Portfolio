import { useEffect } from 'react'
import { finePointer, reducedMotion } from '../../lib/motion'

const TARGET = '[data-tilt], .card'

/**
 * One listener for the whole page: whatever card is under the pointer leans toward it in 3D.
 * Writes --rx, --ry (degrees) and --gx, --gy (sheen position) and adds .is-tilting while active.
 * data-tilt="10" sets a stronger tilt, data-no-tilt opts a card out.
 */
export default function TiltLayer() {
  useEffect(() => {
    if (!finePointer() || reducedMotion()) return undefined
    let current = null
    let frame = 0

    const reset = (el) => {
      el.classList.remove('is-tilting')
      el.style.setProperty('--rx', '0deg')
      el.style.setProperty('--ry', '0deg')
    }
    const move = (e) => {
      const el = e.target.closest?.(TARGET)
      const target = el && !el.hasAttribute('data-no-tilt') ? el : null
      if (current && current !== target) reset(current)
      current = target
      if (!target) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const r = target.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width
        const py = (e.clientY - r.top) / r.height
        const max = Number(target.getAttribute('data-tilt')) || (r.width > 520 ? 3 : 6)
        target.classList.add('is-tilting')
        target.style.setProperty('--ry', `${((px - 0.5) * max * 2).toFixed(2)}deg`)
        target.style.setProperty('--rx', `${((0.5 - py) * max * 2).toFixed(2)}deg`)
        target.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`)
        target.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`)
      })
    }
    const leave = () => { if (current) reset(current); current = null }

    document.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
    }
  }, [])
  return null
}
