import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useTheme } from '../../hooks'
import { useContent } from '../../context/ContentContext'
import { subscribeInterests } from '../../firebase'
import styles from './NavigationBar.module.css'

const LINKS = [
  { label: 'Work',      to: '/work'      },
  { label: 'Interests', to: '/interests' },
  { label: 'About',     to: '/about'     },
  { label: 'Contact',   to: '/contact'   },
]

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z" />
    </svg>
  )
}

export default function NavigationBar() {
  const { theme, toggle } = useTheme()
  const { copy } = useContent()
  const brand = copy('brand')
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [lifted, setLifted] = useState(false)
  /* Whether this route has a section that the bar is allowed to float over
     transparently. Starts true so the very first paint on Home does not flash
     an opaque bar over the hero before the effect below runs. */
  /* '' = not allowed to overlay; 'ground' = the section beneath uses the
     theme's own surface, so theme text colours are correct; 'scrim' = the
     section beneath is a dark scrim over imagery in BOTH themes, so the bar
     must use fixed light type regardless of theme. */
  const [overlay, setOverlay] = useState('ground')

  /* Whether the Interests tab should appear at all. Starts true so a site
     that already has interests never flashes the link away and back on
     first paint; the listener flips it to false only once it has actually
     confirmed the list is empty. A subscribe error fails open (stays true)
     rather than hiding a real tab over a transient network hiccup. */
  const [hasInterests, setHasInterests] = useState(true)

  useEffect(() => {
    const unsubscribe = subscribeInterests(
      items => setHasInterests(items.length > 0),
      () => setHasInterests(true),
    )
    return unsubscribe
  }, [])

  const links = LINKS.filter(l => l.to !== '/interests' || hasInterests)

  /*
   * Whether the bar may be transparent at all on this route.
   *
   * A transparent bar draws its type in the THEME's text colour, which is only
   * legible over the theme's own ground. Most pages now open with a
   * full-strength brand band - the Contact header is mint, which is a light
   * surface in both themes - and bone-white nav type over mint is unreadable.
   *
   * Rather than teach the nav about individual routes, the section that wants
   * to be floated over declares it with `data-nav-overlay` (currently only the
   * home hero, which sets its own dark scrim and so controls its own
   * contrast). Anywhere that attribute is absent, the bar is opaque from the
   * first pixel.
   */
  useEffect(() => {
    const el = document.querySelector('[data-nav-overlay]')
    setOverlay(el ? (el.getAttribute('data-nav-overlay') || 'ground') : '')
  }, [location.pathname])

  /*
   * The bar gains a background once the page has scrolled past the overlay
   * section. The threshold is a fixed 80px rather than the hero's measured
   * height: reading the hero would couple the nav to one page's markup, and
   * the visual goal is only "no longer sitting on top of the first screenful
   * of image".
   *
   * `passive: true` because this listener never calls preventDefault, and
   * without the flag the browser must wait for it before it can scroll.
   */
  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the overlay on navigation. Without this, following a link inside the
  // overlay leaves it open on top of the page that just loaded.
  useEffect(() => { setOpen(false) }, [location.pathname])

  useEffect(() => {
    if (!open) return undefined
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    /* The overlay covers the viewport, so the page behind it must not scroll.
       Lenis drives scrolling from the root element, so hiding overflow on
       <body> alone would not stop it - the class goes on <html>. */
    document.documentElement.classList.add('nav-locked')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.documentElement.classList.remove('nav-locked')
    }
  }, [open])

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>

      <header
        className={[
          styles.bar,
          (lifted || !overlay) ? styles.barLifted : '',
          /* Only while actually floating over a scrim - once lifted the bar has
             its own ground and must go back to theme colours. */
          (!lifted && overlay === 'scrim') ? styles.barOnScrim : '',
        ].filter(Boolean).join(' ')}
      >
        <div className={styles.inner}>
          <Link to="/" className={styles.brand} aria-label={brand.siteName}>
            {/* logo-96, not the full-size logo.v2.png: this renders at 26px, so
                the original would be a 53KB download and a quarter-megapixel
                decode for a thumbnail, on every page. Explicit width/height
                reserves the slot before the image arrives. */}
            <img
              src="/logo-96.v2.png"
              alt=""
              className={styles.brandMark}
              width="26"
              height="26"
            />
            <span className={styles.brandName}>{brand.siteName}</span>
          </Link>

          <nav className={styles.links} aria-label="Main">
            {links.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `${styles.link} ${isActive ? styles.linkActive : ''}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className={styles.tools}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={toggle}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>

            <button
              type="button"
              className={styles.menuBtn}
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
            >
              Menu
            </button>
          </div>
        </div>
      </header>

      {/* Mobile overlay. Rendered always and hidden with a transform rather
          than unmounted, so it can transition both ways. `inert` keeps its
          links out of the tab order while closed; `visibility: hidden` alone
          does that in most engines but not reliably in Safari. */}
      <div
        className={`${styles.overlay} ${open ? styles.overlayOpen : ''}`}
        inert={open ? undefined : ''}
      >
        <div className={styles.overlayHead}>
          <span className="mono">Menu</span>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            Close
          </button>
        </div>

        <nav className={styles.overlayNav} aria-label="Main">
          {[{ label: 'Index', to: '/' }, ...links].map(({ label, to }, i) => (
            <NavLink key={to} to={to} className={styles.overlayLink}>
              <span className={styles.overlayNum}>
                {String(i).padStart(2, '0')}
              </span>
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  )
}
