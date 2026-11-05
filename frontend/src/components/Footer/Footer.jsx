import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useContent } from '../../context/ContentContext'
import { scrollToTarget } from '../../hooks/useMomentumScroll'
import useTilt from '../../hooks/useTilt'
import Button from '../Button'
import CvButton from '../CvButton'
import TextReveal from '../TextReveal'
import { ArrowRight, ArrowUp, ArrowUpRight } from '../Icons'
import styles from './Footer.module.css'

const NAV = [
  { label: 'Index',   to: '/'        },
  { label: 'Work',    to: '/work'    },
  { label: 'About',   to: '/about'   },
  { label: 'Contact', to: '/contact' },
]

function useJohannesburgTime() {
  const fmt = () => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg' }).format(new Date())
  const [time, setTime] = useState(fmt)
  useEffect(() => {
    const id = setInterval(() => setTime(fmt()), 15000)
    return () => clearInterval(id)
  }, [])
  return time
}

export default function Footer() {
  const { copy } = useContent()
  const brand = copy('brand')
  const info = copy('contact')
  const home = copy('home')
  const { pathname } = useLocation()
  const time = useJohannesburgTime()
  const card = useRef(null)
  useTilt(card, 2)

  const social = [
    info.instagram && { label: info.instagramLabel || 'Instagram', href: info.instagram },
    info.linkedin && { label: 'LinkedIn', href: info.linkedin },
    info.facebook && { label: 'Facebook', href: info.facebook },
  ].filter(Boolean)

  return (
    <footer className={styles.footer}>
      <div className="container">
        {pathname !== '/contact' && (
          <section ref={card} className={styles.cta}>
            <div>
              <p className={styles.ctaEyebrow}>{home.contactEyebrow}</p>
              <TextReveal as="h2" className={styles.ctaHead}>{home.contactHeading}</TextReveal>
            </div>
            <div className={styles.ctaActions}>
              <Button to="/contact" size="lg" icon={<ArrowRight size={15} />} className={styles.ctaBtn}>{home.contactCta}</Button>
              {info.email && <a className={`link ${styles.ctaMail}`} href={`mailto:${info.email}`}>{info.email}</a>}
            </div>
          </section>
        )}

        <div className={styles.cols}>
          <div className={styles.brand}>
            <p className={styles.brandName}>{brand.siteName}<span className="dot">.</span></p>
            <p className={styles.muted}>{brand.footerTagline}</p>
            <p className={styles.clock}><span className={`pulse ${styles.live}`} aria-hidden="true" />{time} in {info.location?.split(',')[0] || 'Johannesburg'}</p>
          </div>

          <nav className={styles.col} aria-label="Footer">
            <p className={styles.colHead}>Pages</p>
            {NAV.map(({ label, to }) => <Link key={to} to={to} className="link">{label}</Link>)}
          </nav>

          <div className={styles.col}>
            <p className={styles.colHead}>Contact</p>
            {info.email && <a href={`mailto:${info.email}`} className={`link ${styles.wrap}`}>{info.email}</a>}
            {info.phone && <a href={`tel:${info.phone.replace(/\s+/g, '')}`} className="link">{info.phone}</a>}
            <CvButton asLink />
          </div>

          {social.length > 0 && (
            <div className={styles.col}>
              <p className={styles.colHead}>Elsewhere</p>
              {social.map(({ label, href }) => (
                <a key={href} href={href} className="link" target="_blank" rel="noopener noreferrer">{label}<ArrowUpRight size={12} /></a>
              ))}
            </div>
          )}
        </div>

        <div className={styles.bottom}>
          <p className={styles.muted}>&copy; {new Date().getFullYear()} {brand.siteName}</p>
          <nav className={styles.legal} aria-label="Legal">
            <Link to="/privacy" className={`link ${styles.muted}`}>Privacy</Link>
            <Link to="/terms" className={`link ${styles.muted}`}>Terms</Link>
          </nav>
          <button type="button" className={styles.top} onClick={() => scrollToTarget(0)} aria-label="Back to top" data-cursor="hide">
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </footer>
  )
}
