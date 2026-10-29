import { Link } from 'react-router-dom'
import { useContent } from '../../context/ContentContext'
import styles from './Footer.module.css'

const NAV = [
  { label: 'Index',   to: '/'        },
  { label: 'Work',    to: '/work'    },
  { label: 'About',   to: '/about'   },
  { label: 'Contact', to: '/contact' },
]

export default function Footer() {
  const { copy } = useContent()
  const brand = copy('brand')
  const info  = copy('contact')

  /* Derived, not stored. A hardcoded year silently goes stale, and putting it
     in the editable copy makes it someone's job to remember every January. */
  const year = new Date().getFullYear()

  const social = [
    info.instagram && { label: info.instagramLabel || 'Instagram', href: info.instagram },
    info.linkedin  && { label: 'LinkedIn', href: info.linkedin },
    info.facebook  && { label: 'Facebook', href: info.facebook },
  ].filter(Boolean)

  return (
    <footer className={`tone-accent-soft ${styles.footer}`}>
      <div className={styles.top}>
        {/* Identity. The wordmark is set at display scale so the footer reads
            as the closing plate of the document rather than as fine print. */}
        <div className={styles.identity}>
          <p className={styles.wordmark}>
            {brand.siteName}<span className="dot">.</span>
          </p>
          <p className={styles.tagline}>{brand.footerTagline}</p>
        </div>

        <nav className={styles.col} aria-label="Footer">
          <p className={styles.colHead}>Index</p>
          {NAV.map(({ label, to }) => (
            <Link key={to} to={to} className={styles.colLink}>{label}</Link>
          ))}
        </nav>

        <div className={styles.col}>
          <p className={styles.colHead}>Contact</p>
          {info.email && (
            <a href={`mailto:${info.email}`} className={styles.colLink}>{info.email}</a>
          )}
          {info.phone && (
            <a href={`tel:${info.phone.replace(/\s+/g, '')}`} className={styles.colLink}>
              {info.phone}
            </a>
          )}
          {info.location && <p className={styles.colText}>{info.location}</p>}
        </div>

        {social.length > 0 && (
          <div className={styles.col}>
            <p className={styles.colHead}>Elsewhere</p>
            {social.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className={styles.colLink}
                target="_blank"
                /* noopener is the security-relevant half (it denies the opened
                   page a handle on this window); noreferrer also suppresses
                   the Referer header. Both, because neither costs anything
                   here. */
                rel="noopener noreferrer"
              >
                {label}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className={styles.bottom}>
        <p className={styles.fine}>&copy; {year} {brand.siteName}</p>
        <p className={styles.fine}>Johannesburg, South Africa</p>
        <nav className={styles.legal} aria-label="Legal">
          <Link to="/privacy" className={styles.fine}>Privacy policy</Link>
          <Link to="/terms" className={styles.fine}>Terms of use</Link>
        </nav>
      </div>
    </footer>
  )
}
