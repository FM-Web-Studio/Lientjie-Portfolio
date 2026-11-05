import { useRef } from 'react'
import { gsap, useGSAP, reducedMotion } from '../../lib/motion'

// Counts the number inside a value up from zero when it scrolls into view.
// Keeps whatever surrounds it and its zero padding: "05" and "3rd" both work.
export default function Counter({ value, duration = 2, className = '' }) {
  const ref = useRef(null)
  const text = String(value ?? '')
  const match = text.match(/^(\D*)(\d+)(.*)$/)

  useGSAP(() => {
    if (!match || reducedMotion() || !ref.current) return
    const [, pre, num, post] = match
    const target = Number(num)
    const pad = num.length
    const state = { n: 0 }
    ref.current.textContent = `${pre}${'0'.padStart(pad, '0')}${post}`
    gsap.to(state, {
      n: target,
      duration,
      ease: 'expo.out',
      scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true },
      onUpdate: () => { if (ref.current) ref.current.textContent = `${pre}${String(Math.round(state.n)).padStart(pad, '0')}${post}` },
    })
  }, { scope: ref, dependencies: [text] })

  return <span ref={ref} className={className}>{text}</span>
}
