import { useEffect, useRef, useState } from 'react'
import { gsap, reducedMotion } from '../../lib/motion'
import { useContent } from '../../context/ContentContext'
import styles from './Loader.module.css'

const SEEN = 'lm-intro-seen'

const shouldPlay = () => {
  if (typeof window === 'undefined' || reducedMotion()) return false
  try { return sessionStorage.getItem(SEEN) !== '1' } catch { return true }
}

/**
 * The opening, once per visit: the name rises while the count runs to 100,
 * then the sheet lifts away. Any key or click skips it.
 */
export default function Loader() {
  const { copy, loaded } = useContent()
  const brand = copy('brand')
  const home = copy('home')
  const [play] = useState(() => {
    const yes = shouldPlay()
    if (yes) document.documentElement.dataset.loading = 'true'
    return yes
  })
  const [gone, setGone] = useState(!play)
  const root = useRef(null)
  const count = useRef(null)

  useEffect(() => {
    if (!play || !loaded) return undefined
    const el = root.current
    const q = gsap.utils.selector(el)
    const state = { n: 0 }
    let finished = false

    const finish = () => {
      if (finished) return
      finished = true
      try { sessionStorage.setItem(SEEN, '1') } catch { /* private mode */ }
      gsap.timeline({
        onComplete: () => setGone(true),
      })
        .to(q(`.${styles.inner}`), { yPercent: -12, opacity: 0, duration: 0.9, ease: 'power3.in' })
        .add(() => {
          delete document.documentElement.dataset.loading
          window.dispatchEvent(new Event('loader:done'))
        }, '-=0.35')
        .to(el, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=0.45')
    }

    let tl
    const ctx = gsap.context(() => {
      tl = gsap.timeline({ delay: 0.15 })
      tl.from(q(`.${styles.char}`), { yPercent: 120, duration: 1.1, stagger: 0.035, ease: 'expo.out' }, 0.35)
        .from(q(`.${styles.meta}`), { opacity: 0, y: 12, duration: 0.8, stagger: 0.1 }, 0.6)
        .to(state, {
          n: 100,
          duration: 1.4,
          ease: 'power2.inOut',
          onUpdate: () => { if (count.current) count.current.textContent = String(Math.round(state.n)).padStart(3, '0') },
        }, 0)
        .to(q(`.${styles.barFill}`), { scaleX: 1, duration: 1.4, ease: 'power2.inOut' }, 0)
    }, el)

    const ready = Promise.all([
      new Promise(r => tl.eventCallback('onComplete', r)),
      document.fonts?.ready ?? Promise.resolve(),
    ])
    ready.then(finish)

    const skip = () => { tl.progress(1); finish() }
    window.addEventListener('keydown', skip, { once: true })
    el.addEventListener('pointerdown', skip, { once: true })
    return () => {
      window.removeEventListener('keydown', skip)
      el.removeEventListener('pointerdown', skip)
      ctx.revert()
    }
  }, [play, loaded])

  if (gone) return null

  const first = home.heroNameFirst || brand.siteName.split(' ')[0]
  const last = home.heroNameLast || brand.siteName.split(' ').slice(1).join(' ')
  const chars = (word) => [...word].map((c, i) => <span key={i} className={styles.char}>{c}</span>)

  return (
    <div ref={root} className={styles.loader} role="status" aria-label="Loading">
      <div className={styles.inner}>
        <p className={`${styles.meta} ${styles.metaTop}`}>
          <span>{brand.footerTagline}</span>
          <span>{new Date().getFullYear()}</span>
        </p>
        <h1 className={styles.name} style={{ visibility: loaded ? 'visible' : 'hidden' }}>
          <span className={styles.word}><em>{chars(first)}</em></span>
          <span className={styles.word}>{chars(last)}<span className={`${styles.char} dot`}>.</span></span>
        </h1>
        <div className={`${styles.meta} ${styles.metaBottom}`}>
          <span className={styles.count}><span ref={count}>000</span><sup>%</sup></span>
          <span className={styles.bar}><span className={styles.barFill} /></span>
          <span className={styles.hint}>Click to skip</span>
        </div>
      </div>
    </div>
  )
}
