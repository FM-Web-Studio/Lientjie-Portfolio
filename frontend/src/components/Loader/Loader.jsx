import { useEffect, useRef, useState } from 'react'
import { gsap, reducedMotion } from '../../lib/motion'
import { useContent } from '../../context/ContentContext'
import styles from './Loader.module.css'

const SEEN = 'lm-intro-seen'
const TONES = ['mint', 'sky', 'lavender', 'coral', 'peach']
// The little building, ground floor first: block width (% of the stack) and a slight sideways offset.
const BLOCKS = [[100, 0], [72, -10], [86, 8], [58, -4], [40, 12]]

const shouldPlay = () => {
  if (typeof window === 'undefined' || reducedMotion()) return false
  try { return sessionStorage.getItem(SEEN) !== '1' } catch { return true }
}

/**
 * The opening, once per visit.
 * 1. At once: five blocks in the brand colours drop in and stack into a small building, the count climbs.
 * 2. When the site copy is in: the name rises letter by letter and the count completes.
 * 3. Exit: a curtain of the five colours sweeps up over everything and on off the top, revealing the site.
 * Any key or click skips straight to the exit.
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
  const build = useRef(null)
  const reveal = useRef(null)
  const finished = useRef(false)
  const state = useRef({ n: 0 })
  const write = () => { if (count.current) count.current.textContent = String(Math.round(state.current.n)).padStart(3, '0') }

  const finish = () => {
    if (finished.current || !root.current) return
    finished.current = true
    try { sessionStorage.setItem(SEEN, '1') } catch { /* private mode */ }
    const q = gsap.utils.selector(root.current)
    gsap.timeline({ onComplete: () => setGone(true) })
      .to(q(`.${styles.stage}`), { scale: 0.94, opacity: 0, duration: 0.45, ease: 'power2.in' })
      .to(q(`.${styles.meta}`), { opacity: 0, duration: 0.3 }, 0)
      .set(q(`.${styles.curtain} span`), { yPercent: 101, visibility: 'visible' }, 0)
      .to(q(`.${styles.curtain} span`), { yPercent: 0, duration: 0.6, stagger: 0.06, ease: 'expo.inOut' }, 0.15)
      .set(q(`.${styles.ground}`), { autoAlpha: 0 })
      .add(() => {
        delete document.documentElement.dataset.loading
        window.dispatchEvent(new Event('loader:done'))
      })
      .to(q(`.${styles.curtain} span`), { yPercent: -101, duration: 0.7, stagger: 0.06, ease: 'expo.inOut' })
  }

  // Phase one: starts straight away so the screen is never still.
  useEffect(() => {
    if (!play) return undefined
    const q = gsap.utils.selector(root.current)
    const ctx = gsap.context(() => {
      build.current = gsap.timeline()
        .from(q(`.${styles.meta}`), { opacity: 0, y: 10, duration: 0.6, stagger: 0.08 }, 0)
        // The blocks drop on the compositor (CSS), so they stay smooth while the page renders behind.
        .add(() => {}, 1.55)
        .to(state.current, { n: 72, duration: 1.3, ease: 'power2.out', onUpdate: write }, 0)
        .to(q(`.${styles.barFill}`), { scaleX: 0.72, duration: 1.3, ease: 'power2.out' }, 0)
    }, root)
    return () => ctx.revert()
  }, [play])

  // Phase two: once the real copy is in and the building has landed.
  useEffect(() => {
    if (!play || !loaded) return undefined
    const q = gsap.utils.selector(root.current)
    let cancelled = false
    const ctx = gsap.context(() => {})
    Promise.resolve(build.current).then(() => {
      if (cancelled || finished.current) return
      ctx.add(() => {
        reveal.current = gsap.timeline()
          .set(q(`.${styles.name}`), { visibility: 'visible' })
          .from(q(`.${styles.char}`), { yPercent: 110, opacity: 0, duration: 0.7, stagger: 0.022, ease: 'expo.out' }, 0)
          .from(q(`.${styles.dot}`), { scale: 0, duration: 0.5, ease: 'back.out(3)' }, 0.35)
          .to(state.current, { n: 100, duration: 0.8, ease: 'power2.inOut', onUpdate: write }, 0)
          .to(q(`.${styles.barFill}`), { scaleX: 1, duration: 0.8, ease: 'power2.inOut' }, 0)
      })
      Promise.all([reveal.current, document.fonts?.ready]).then(() => { if (!cancelled) setTimeout(finish, 120) })
    })
    return () => { cancelled = true; ctx.revert() }
  }, [play, loaded]) // eslint-disable-line react-hooks/exhaustive-deps

  // Skip: any key or click jumps to the exit.
  useEffect(() => {
    if (!play) return undefined
    const el = root.current
    const skip = () => {
      build.current?.progress(1)
      reveal.current?.progress(1)
      gsap.set(gsap.utils.selector(el)(`.${styles.name}`), { visibility: 'visible' })
      finish()
    }
    window.addEventListener('keydown', skip, { once: true })
    el?.addEventListener('pointerdown', skip, { once: true })
    return () => { window.removeEventListener('keydown', skip); el?.removeEventListener('pointerdown', skip) }
  }, [play]) // eslint-disable-line react-hooks/exhaustive-deps

  if (gone) return null

  const first = home.heroNameFirst || brand.siteName.split(' ')[0]
  const last = home.heroNameLast || brand.siteName.split(' ').slice(1).join(' ')
  const chars = (word) => [...word].map((c, i) => <span key={i} className={styles.char}>{c}</span>)
  // Top floor first in the DOM, so the column reads bottom-up; the drop stagger runs ground floor first.
  const floors = BLOCKS.map(([w, x], i) => ({ w, x, tone: TONES[i] })).reverse()

  return (
    <div ref={root} className={styles.loader} role="status" aria-label="Loading">
      <div className={styles.ground} />

      <p className={`${styles.meta} ${styles.top}`}>
        <span>{brand.footerTagline}</span>
        <span>{new Date().getFullYear()}</span>
      </p>

      <div className={styles.stage}>
        <div className={styles.building} aria-hidden="true">
          {floors.map(f => (
            <span key={f.tone} className={`${styles.block} ${styles[f.tone]}`} style={{ width: `${f.w}%`, marginLeft: `${f.x * 2}px` }} />
          ))}
          <span className={styles.shadow} />
        </div>
        <h1 className={styles.name} style={{ visibility: 'hidden' }}>
          <span className={styles.line}>{chars(first)}</span>
          <span className={styles.line}>{chars(last)}<span className={styles.dot} /></span>
        </h1>
      </div>

      <div className={`${styles.meta} ${styles.bottom}`}>
        <span className={styles.count}><span ref={count}>000</span>%</span>
        <span className={styles.bar}><span className={styles.barFill} /></span>
        <span className={styles.hint}>Click to skip</span>
      </div>

      <div className={styles.curtain} aria-hidden="true">
        {TONES.map(t => <span key={t} className={styles[t]} />)}
      </div>
    </div>
  )
}
