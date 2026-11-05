import { Suspense, useEffect, useLayoutEffect, useRef } from 'react'
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

/**
 * Routes that switch instantly: the new page replaces the old one straight away,
 * starts at the top and fades up in a fraction of a second. No covering curtain.
 */
export default function TransitionRoutes({ children }) {
  const location = useLocation()
  const wrap = useRef(null)
  const first = useRef(true)

  useLayoutEffect(() => {
    if (first.current) { first.current = false; return }
    scrollTo(location.hash)
    requestAnimationFrame(() => ScrollTrigger.refresh())
    if (!reducedMotion() && wrap.current) {
      gsap.fromTo(wrap.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', clearProps: 'transform,opacity' })
    }
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (location.hash) scrollTo(location.hash) }, [location.hash])

  return (
    <div ref={wrap}>
      <Suspense fallback={<Holder />}>
        <Routes location={location}>{children}</Routes>
      </Suspense>
    </div>
  )
}
