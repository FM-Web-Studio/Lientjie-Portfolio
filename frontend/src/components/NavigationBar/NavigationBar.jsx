import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useTheme } from '../../hooks'
import { useContent } from '../../context/ContentContext'
import { subscribeInterests } from '../../firebase'
import { gsap, reducedMotion } from '../../lib/motion'
import { Roll } from '../Button'
import CvButton from '../CvButton'
import { Sun, Moon, ArrowUpRight } from '../Icons'
import styles from './NavigationBar.module.css'

const LINKS = [
  { label: 'Work',      to: '/work'      },
  { label: 'Interests', to: '/interests' },
  { label: 'About',     to: '/about'     },
  { label: 'Contact',   to: '/contact'   },
]

export function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useTheme()
  return (
    <button
      type="button"
      className={`${styles.iconBtn} ${className}`}
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      data-cursor="hide"
    >
      <span className={styles.iconSwap} data-theme-icon={theme}>
        <Sun size={16} />
        <Moon size={16} />
      </span>
    </button>
  )
}

export default function NavigationBar() {
  const { copy, loaded } = useContent()
  const brand = copy('brand')
  const info = copy('contact')
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [overlay, setOverlay] = useState('ground')
  const [hasInterests, setHasInterests] = useState(true)
  const progress = useRef(null)
  const menu = useRef(null)
  const menuBtn = useRef(null)
  const linksRef = useRef(null)
  const pill = useRef(null)

  useEffect(() => subscribeInterests(items => setHasInterests(items.length > 0), () => setHasInterests(true)), [])
  const links = LINKS.filter(l => l.to !== '/interests' || hasInterests)

  // A page whose first section is a dark image declares data-nav-overlay="scrim", so the bar uses light type over it.
  useEffect(() => {
    const check = () => {
      const el = document.querySelector('main [data-nav-overlay]')
      setOverlay(el?.getAttribute('data-nav-overlay') || 'ground')
    }
    // Pages mount after the site copy loads, so look again shortly after navigating.
    const timers = [50, 700, 1600].map(ms => setTimeout(check, ms))
    return () => timers.forEach(clearTimeout)
  }, [location.pathname])

  // Hide on the way down, return on the way up, and track how far down the page is.
  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      const max = document.documentElement.scrollHeight - window.innerHeight
      setScrolled(y > 40)
      if (Math.abs(y - last) > 6) { setHidden(y > last && y > 300); last = y }
      if (progress.current) progress.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // The pill behind the desktop links glides to whichever link is active or hovered.
  const movePill = (target) => {
    const wrap = linksRef.current
    if (!wrap || !pill.current) return
    const el = target || wrap.querySelector('[aria-current="page"]')
    // overwrite: a newer move cancels a slower one still running, so the pill can never fade back in.
    if (!el) { gsap.to(pill.current, { opacity: 0, duration: 0.3, overwrite: 'auto' }); return }
    const a = el.getBoundingClientRect()
    const b = wrap.getBoundingClientRect()
    gsap.to(pill.current, { x: a.left - b.left, width: a.width, opacity: 1, duration: 0.6, ease: 'expo.out', overwrite: 'auto' })
  }
  useLayoutEffect(() => { movePill() }, [location.pathname, hasInterests]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onResize = () => movePill()
    window.addEventListener('resize', onResize)
    document.fonts?.ready.then(onResize)
    return () => window.removeEventListener('resize', onResize)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setOpen(false) }, [location.pathname])

  // Phones and tablets only: the panel drops from the menu button, its links follow one by one.
  useEffect(() => {
    const el = menu.current
    if (!el) return undefined
    const q = gsap.utils.selector(el)
    const instant = reducedMotion()
    const panel = q(`.${styles.panel}`)
    const shade = q(`.${styles.shade}`)

    if (open) {
      document.documentElement.classList.add('nav-locked')
      gsap.killTweensOf([panel, shade, q('[data-menu-item]')])
      gsap.timeline()
        .set(el, { visibility: 'visible' })
        .fromTo(shade, { opacity: 0 }, { opacity: 1, duration: instant ? 0 : 0.3 }, 0)
        .fromTo(panel, { opacity: 0, y: -10, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: instant ? 0 : 0.45, ease: 'expo.out' }, 0)
        .fromTo(q('[data-menu-item]'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: instant ? 0 : 0.4, stagger: 0.04, ease: 'power3.out' }, 0.08)
      const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
      // Growing the window to desktop width closes it, since the nav links show there.
      const wide = window.matchMedia('(min-width: 961px)')
      const onWide = (e) => { if (e.matches) setOpen(false) }
      window.addEventListener('keydown', onKey)
      wide.addEventListener('change', onWide)
      return () => { window.removeEventListener('keydown', onKey); wide.removeEventListener('change', onWide) }
    }
    document.documentElement.classList.remove('nav-locked')
    if (el.style.visibility === 'visible') {
      gsap.timeline()
        .to(panel, { opacity: 0, y: -8, scale: 0.97, duration: instant ? 0 : 0.22, ease: 'power2.in' }, 0)
        .to(shade, { opacity: 0, duration: instant ? 0 : 0.22 }, 0)
        .set(el, { visibility: 'hidden' })
    }
    return undefined
  }, [open])

  const onScrim = !scrolled && overlay === 'scrim' && !open
  const onLight = !scrolled && overlay === 'light-ground' && !open
  const social = [
    info.instagram && { label: 'Instagram', href: info.instagram },
    info.linkedin && { label: 'LinkedIn', href: info.linkedin },
    info.facebook && { label: 'Facebook', href: info.facebook },
  ].filter(Boolean)

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header
        className={[styles.bar, scrolled && styles.scrolled, hidden && !open && styles.hidden, onScrim && styles.onScrim, onLight && styles.onLight, open && styles.menuOpen].filter(Boolean).join(' ')}
      >
        <div className={styles.inner}>
          <Link to="/" className={`roll-host ${styles.brand}`} aria-label={brand.siteName} data-cursor="hide">
            <img src="/logo-96.v2.png" alt="" className={styles.brandMark} width="30" height="30" />
            <span className={styles.brandName} style={{ visibility: loaded ? 'visible' : 'hidden' }}><Roll>{brand.siteName}</Roll></span>
          </Link>

          <nav ref={linksRef} className={styles.links} aria-label="Main" onPointerLeave={() => movePill()}>
            <span ref={pill} className={styles.pill} aria-hidden="true" />
            {links.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `roll-host ${styles.link} ${isActive ? styles.linkActive : ''}`}
                onPointerEnter={(e) => movePill(e.currentTarget)}
                data-cursor="hide"
              >
                <Roll>{label}</Roll>
              </NavLink>
            ))}
          </nav>

          <div className={styles.tools}>
            <CvButton variant="accent" size="sm" className={styles.barCv} />
            <ThemeToggle />
            <button
              ref={menuBtn}
              type="button"
              className={styles.menuBtn}
              onClick={() => setOpen(o => !o)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="site-menu"
              data-cursor="hide"
            >
              <span className={styles.menuWord}>{open ? 'Close' : 'Menu'}</span>
              <span className={styles.burger} aria-hidden="true"><span /><span /></span>
            </button>
          </div>
        </div>
        <span className={styles.progress} aria-hidden="true"><span ref={progress} /></span>
      </header>

      <div id="site-menu" ref={menu} className={styles.menu} inert={open ? undefined : ''} data-lenis-prevent>
        <button type="button" className={styles.shade} onClick={() => setOpen(false)} aria-label="Close menu" tabIndex={-1} />
        <div className={styles.panel}>
          <nav className={styles.menuLinks} aria-label="Menu">
            {links.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `${styles.menuLink} ${isActive ? styles.menuLinkActive : ''}`}
                data-menu-item
              >
                <span>{label}</span>
                <ArrowUpRight size={18} className={styles.menuArrow} />
              </NavLink>
            ))}
          </nav>
          <div className={styles.menuFoot} data-menu-item>
            {info.email && <a className={styles.menuMail} href={`mailto:${info.email}`}>{info.email}</a>}
            {social.length > 0 && (
              <div className={styles.menuSocial}>
                {social.map(sl => <a key={sl.href} href={sl.href} target="_blank" rel="noopener noreferrer">{sl.label}</a>)}
              </div>
            )}
            <CvButton variant="accent" block />
          </div>
        </div>
      </div>
    </>
  )
}
