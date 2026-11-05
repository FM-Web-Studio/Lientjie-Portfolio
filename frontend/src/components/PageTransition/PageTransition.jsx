import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Routes, useLocation } from 'react-router-dom'
import { gsap, ScrollTrigger, reducedMotion } from '../../lib/motion'
import { getLenis } from '../../hooks/useMomentumScroll'

function scrollTo(hash) {
  const lenis = getLenis()
  const target = hash && document.querySelector(hash)
  if (target) { lenis ? lenis.scrollTo(target, { immediate: true, force: true, offset: -90 }) : target.scrollIntoView(); return }
  lenis ? lenis.scrollTo(0, { immediate: true, force: true }) : window.scrollTo(0, 0)
}

function Holder() {
  return <div style={{ minHeight: '100svh' }} aria-hidden="true" />
}

const OUT = 0.22
const IN = 0.5

/**
 * Page changes as a quick cross-fade: the old page eases out and sinks slightly,
 * the new one starts at the top and eases up into place. About half a second in all.
 * Pages are preloaded, so nothing waits on a download in between.
 */
export default function TransitionRoutes({ children }) {
  const location = useLocation()
  const [shown, setShown] = useState(location)
  const wrap = useRef(null)
  const leaving = useRef(null)

  // A new address: fade the current page out, then swap.
  useEffect(() => {
    if (location.pathname === shown.pathname) {
      if (location.key !== shown.key) setShown(location)
      return
    }
    const el = wrap.current
    if (reducedMotion() || !el) { setShown(location); return }
    leaving.current?.kill()
    leaving.current = gsap.to(el, {
      opacity: 0,
      y: -12,
      duration: OUT,
      ease: 'power2.in',
      onComplete: () => setShown(location),
    })
  }, [location]) // eslint-disable-line react-hooks/exhaustive-deps

  // The new page is in the DOM: jump to the top while invisible, then fade it in.
  const first = useRef(true)
  useLayoutEffect(() => {
    if (first.current) { first.current = false; return }
    scrollTo(shown.hash)
    requestAnimationFrame(() => ScrollTrigger.refresh())
    const el = wrap.current
    if (reducedMotion() || !el) return
    gsap.fromTo(el,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: IN, ease: 'power3.out', clearProps: 'opacity,transform' })
  }, [shown.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (shown.hash) scrollTo(shown.hash) }, [shown.hash])

  return (
    <div ref={wrap}>
      <Suspense fallback={<Holder />}>
        <Routes location={shown}>{children}</Routes>
      </Suspense>
    </div>
  )
}
