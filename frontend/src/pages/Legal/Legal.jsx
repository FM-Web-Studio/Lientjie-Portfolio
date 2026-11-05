import { Fragment, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useContent } from '../../context/ContentContext'
import { LEGAL_UPDATED, privacyPolicy, termsOfUse } from '../../content/legal'
import { Reveal, Button, ArrowRight } from '../../components'
import { scrollToTarget } from '../../hooks'
import { gsap, ScrollTrigger, useGSAP } from '../../lib/motion'
import styles from './Legal.module.css'

const LINK = /\[([^\]]+)\]\(([^)]+)\)/g
const pad = n => String(n).padStart(2, '0')

// Plain text with [text](url) links. Site paths stay in the app, the rest open as normal links.
function Inline({ text }) {
  const parts = []
  let last = 0
  for (const m of text.matchAll(LINK)) {
    parts.push(text.slice(last, m.index))
    const [, label, href] = m
    parts.push(href.startsWith('/')
      ? <Link key={m.index} to={href}>{label}</Link>
      : <a key={m.index} href={href} {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{label}</a>)
    last = m.index + m[0].length
  }
  parts.push(text.slice(last))
  return parts.map((p, i) => <Fragment key={i}>{p}</Fragment>)
}

function Legal({ build, other }) {
  const { copy } = useContent()
  const name = copy('brand').siteName || 'Lientjie Meiring'
  const info = copy('contact')
  const doc = build({
    name,
    email: info.email || 'meiringlientjie0214@gmail.com',
    location: info.location || 'Gauteng, South Africa',
  })

  const root = useRef(null)
  const [active, setActive] = useState(0)

  // Highlights the section being read in the contents list.
  useGSAP(() => {
    gsap.utils.toArray('[data-legal-section]', root.current).forEach((el, i) => ScrollTrigger.create({
      trigger: el,
      start: 'top 40%',
      end: 'bottom 40%',
      onToggle: self => { if (self.isActive) setActive(i) },
    }))
  }, { scope: root, dependencies: [doc.title] })

  const goTo = (e, i) => {
    e.preventDefault()
    const el = document.getElementById(`s-${pad(i + 1)}`)
    if (el) scrollToTarget(el, { offset: -96 })
  }

  return (
    <div ref={root} className="container">
      <header className={styles.hero}>
        <Reveal variant="rise-sm" className={styles.meta}>
          <span className="badge badge-dot">Legal</span>
          <span className={styles.updated}>Updated {LEGAL_UPDATED}</span>
        </Reveal>
        <Reveal as="h1" variant="rise" index={1} className={styles.title}>
          {doc.title}<span className="dot">.</span>
        </Reveal>
        <Reveal as="p" variant="rise" index={2} className={styles.intro}>{doc.intro}</Reveal>
      </header>

      <div className={styles.page}>
        <aside className={styles.tocCol}>
          <nav className={styles.toc} aria-label="Contents">
            <p className={styles.tocHead}>Contents</p>
            <ol className={styles.tocList}>
              {doc.sections.map((s, i) => (
                <li key={`${i}-${s.heading}`}>
                  <a
                    href={`#s-${pad(i + 1)}`}
                    className={styles.tocLink}
                    aria-current={active === i ? 'true' : undefined}
                    onClick={e => goTo(e, i)}
                  >
                    <span className={styles.tocNum}>{i + 1}</span>
                    <span>{s.heading}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className={styles.body}>
          <details className={`card ${styles.tocMobile}`}>
            <summary>
              <span>Contents</span>
              <span className={styles.tocPlus} aria-hidden="true" />
            </summary>
            <ol>
              {doc.sections.map((s, i) => (
                <li key={`${i}-${s.heading}`}>
                  <a href={`#s-${pad(i + 1)}`} onClick={e => goTo(e, i)}>
                    <span className={styles.tocNum}>{i + 1}</span>
                    <span>{s.heading}</span>
                  </a>
                </li>
              ))}
            </ol>
          </details>

          {doc.sections.map((s, i) => (
            <section
              key={`${i}-${s.heading}`}
              id={`s-${pad(i + 1)}`}
              data-legal-section=""
              className={styles.section}
            >
              <h2 className={styles.heading}>
                <span className={styles.num} aria-hidden="true">{i + 1}</span>
                <span>{s.heading}</span>
              </h2>
              {s.blocks.map((b, j) => (Array.isArray(b)
                ? <ul key={j}>{b.map((item, k) => <li key={`${k}-${item}`}><Inline text={item} /></li>)}</ul>
                : <p key={j}><Inline text={b} /></p>))}
            </section>
          ))}

          <div className={`card ${styles.other}`}>
            <p className={styles.otherKey}>See also the {other.label}.</p>
            <Button to={other.to} size="sm" icon={<ArrowRight size={14} />}>
              {other.label.charAt(0).toUpperCase() + other.label.slice(1)}
            </Button>
          </div>
        </article>
      </div>
    </div>
  )
}

export function Privacy() {
  return <Legal build={privacyPolicy} other={{ to: '/terms', label: 'terms of use' }} />
}

export function Terms() {
  return <Legal build={termsOfUse} other={{ to: '/privacy', label: 'privacy policy' }} />
}
