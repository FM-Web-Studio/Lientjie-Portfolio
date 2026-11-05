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
  { label: 'Index',     to: '/',          menuOnly: true },
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
  const { copy } = useContent()
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
    if (!el) { gsap.to(pill.current, { opacity: 0, duration: 0.3 }); return }
    const a = el.getBoundingClientRect()
    const b = wrap.getBoundingClientRect()
    gsap.to(pill.current, { x: a.left - b.left, width: a.width, opacity: 1, duration: 0.6, ease: 'expo.out' })
  }
  useLayoutEffect(() => { movePill() }, [location.pathname, hasInterests]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onResize = () => movePill()
    window.addEventListener('resize', onResize)
    document.fonts?.ready.then(onResize)
    return () => window.removeEventListener('resize', onResize)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setOpen(false) }, [location.pathname])

  // The menu opens as a circle growing out of the menu button.
  useEffect(() => {
    const el = menu.current
    if (!el) return undefined
    const r = menuBtn.current?.getBoundingClientRect()
    const x = r ? r.left + r.width / 2 : window.innerWidth - 40
    const y = r ? r.top + r.height / 2 : 40
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
    const q = gsap.utils.selector(el)
    const instant = reducedMotion()

    if (open) {
      document.documentElement.classList.add('nav-locked')
      gsap.timeline()
        .set(el, { visibility: 'visible', clipPath: `circle(0px at ${x}px ${y}px)` })
        .to(el, { clipPath: `circle(${radius}px at ${x}px ${y}px)`, duration: instant ? 0 : 0.9, ease: 'expo.inOut' })
        .fromTo(q('[data-menu-item]'), { yPercent: 110 }, { yPercent: 0, duration: instant ? 0 : 1, stagger: 0.06, ease: 'expo.out' }, instant ? 0 : '-=0.45')
        .fromTo(q('[data-menu-fade]'), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: instant ? 0 : 0.7, stagger: 0.05 }, '<0.15')
      const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
    document.documentElement.classList.remove('nav-locked')
    if (el.style.visibility === 'visible') {
      gsap.timeline()
        .to(q('[data-menu-item]'), { yPercent: -110, duration: instant ? 0 : 0.45, stagger: 0.03, ease: 'power3.in' })
        .to(el, { clipPath: `circle(0px at ${x}px ${y}px)`, duration: instant ? 0 : 0.75, ease: 'expo.inOut' }, '-=0.2')
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
            <span className={styles.brandName}><Roll>{brand.siteName}</Roll></span>
          </Link>

          <nav ref={linksRef} className={styles.links} aria-label="Main" onPointerLeave={() => movePill()}>
            <span ref={pill} className={styles.pill} aria-hidden="true" />
            {links.filter(l => !l.menuOnly).map(({ label, to }) => (
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
        <div className={styles.menuGrid}>
          <nav className={styles.menuLinks} aria-label="Menu">
            {links.map(({ label, to }, i) => (
              <span key={to} className={styles.menuRow}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) => `${styles.menuLink} ${isActive ? styles.menuLinkActive : ''}`}
                  data-menu-item
                  data-cursor="open"
                  data-cursor-label="Go"
                >
                  <span className={styles.menuNum}>{String(i + 1).padStart(2, '0')}</span>
                  <span className={styles.menuLabel}>{label}</span>
                  <ArrowUpRight size={28} className={styles.menuArrow} />
                </NavLink>
              </span>
            ))}
          </nav>

          <aside className={styles.menuAside}>
            <div data-menu-fade className={styles.menuBlock}>
              <p className="eyebrow">Get in touch</p>
              {info.email && <a className="link" href={`mailto:${info.email}`}>{info.email}</a>}
              {info.phone && <a className="link" href={`tel:${info.phone.replace(/\s+/g, '')}`}>{info.phone}</a>}
            </div>
            {social.length > 0 && (
              <div data-menu-fade className={styles.menuBlock}>
                <p className="mono">Elsewhere</p>
                {social.map(s => (
                  <a key={s.href} className="link" href={s.href} target="_blank" rel="noopener noreferrer">{s.label}<ArrowUpRight size={12} /></a>
                ))}
              </div>
            )}
            <div data-menu-fade className={styles.menuBlock}>
              <CvButton />
            </div>
            <p data-menu-fade className={`mono ${styles.menuFoot}`}>{info.location}</p>
          </aside>
        </div>
      </div>
    </>
  )
}
