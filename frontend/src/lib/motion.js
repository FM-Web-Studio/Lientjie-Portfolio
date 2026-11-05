import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP)

// One easing vocabulary for the whole site, so every movement feels related.
gsap.defaults({ ease: 'expo.out', duration: 1.1 })
export const EASE = {
  out: 'expo.out',
  inOut: 'expo.inOut',
  soft: 'power3.out',
  curtain: 'power4.inOut',
}

export const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export const finePointer = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(hover: hover) and (pointer: fine)').matches

// Runs fn once the opening loader has lifted, or at once when it is not playing.
export function afterLoader(fn) {
  if (document.documentElement.dataset.loading !== 'true') { fn(); return () => {} }
  const run = () => fn()
  window.addEventListener('loader:done', run, { once: true })
  return () => window.removeEventListener('loader:done', run)
}

// Runs fn once nothing covers the page (the first-visit loader), so entrances are seen.
export function afterCurtain(fn) {
  const root = document.documentElement
  if (root.dataset.loading !== 'true' && root.dataset.curtain !== 'closed') { fn(); return () => {} }
  let done = false
  const run = () => {
    if (done || root.dataset.loading === 'true' || root.dataset.curtain === 'closed') return
    done = true
    fn()
  }
  window.addEventListener('loader:done', run)
  window.addEventListener('curtain:open', run)
  return () => {
    window.removeEventListener('loader:done', run)
    window.removeEventListener('curtain:open', run)
  }
}

export { gsap, ScrollTrigger, SplitText, useGSAP }
