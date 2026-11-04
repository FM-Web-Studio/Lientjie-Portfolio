import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getLenis } from '../../hooks'

/**
 * Reset scroll position on navigation.
 *
 * Without this, clicking a nav link keeps the previous page's scroll offset -
 * so leaving a scrolled Home page drops you two-thirds of the way down Work,
 * below its heading, usually staring at loading skeletons. It reads as the
 * site being broken.
 *
 * Lenis owns the scroll position when momentum scrolling is active, so it has
 * to be told directly; `window.scrollTo` alone gets overwritten on its next
 * frame. `immediate` skips the easing - animating the reset would show the
 * visitor a fast scroll through a page they never asked to see.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true })
    else window.scrollTo(0, 0)
  }, [pathname])

  return null
}
