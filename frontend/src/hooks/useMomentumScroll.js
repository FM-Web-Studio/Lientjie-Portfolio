import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger, reducedMotion } from '../lib/motion'

let lenisInstance = null
export const getLenis = () => lenisInstance

// Smooth scrolling, driven by GSAP's ticker so scroll-linked animations never lag a frame behind.
export function scrollToTarget(target, options = {}) {
  const lenis = getLenis()
  if (lenis) lenis.scrollTo(target, { duration: 1.4, ...options })
  else if (typeof target === 'number') window.scrollTo({ top: target, behavior: options.immediate ? 'auto' : 'smooth' })
  else document.querySelector(target)?.scrollIntoView({ behavior: options.immediate ? 'auto' : 'smooth' })
}

// Content arrives from Firestore after first paint and changes the page height, which would
// leave every scroll trigger below it in the wrong place. Re-measure whenever the page resizes.
function useTriggerRefresh() {
  useEffect(() => {
    let last = document.body.scrollHeight
    let timer = 0
    const ro = new ResizeObserver(() => {
      const h = document.body.scrollHeight
      if (Math.abs(h - last) < 2) return
      last = h
      clearTimeout(timer)
      timer = setTimeout(() => { ScrollTrigger.sort(); ScrollTrigger.refresh() }, 150)
    })
    ro.observe(document.body)
    return () => { ro.disconnect(); clearTimeout(timer) }
  }, [])
}

export default function useMomentumScroll() {
  useTriggerRefresh()
  useEffect(() => {
    if (reducedMotion()) return undefined

    // lerp 0.16 keeps the glide but follows the wheel closely; lower values feel like the page lags.
    const lenis = new Lenis({ lerp: 0.16, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.2 })
    lenisInstance = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
      if (lenisInstance === lenis) lenisInstance = null
    }
  }, [])
}
