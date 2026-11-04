import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { useContent } from '../../context/ContentContext'
import { LEGAL_UPDATED, privacyPolicy, termsOfUse } from '../../content/legal'
import styles from './Legal.module.css'

const LINK = /\[([^\]]+)\]\(([^)]+)\)/g

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

  return (
    <section className={`tone-base ${styles.page}`}>
      <div className="grid12">
        <article className={styles.body}>
          <p className={styles.eyebrow}>Updated {LEGAL_UPDATED}</p>
          <h1 className={styles.title}>{doc.title}<span className="dot">.</span></h1>
          <p className={styles.intro}>{doc.intro}</p>

          {doc.sections.map((s, i) => (
            <section key={s.heading} className={styles.section}>
              <h2 className={styles.heading}>
                <span className={styles.num}>{String(i + 1).padStart(2, '0')}</span>{s.heading}
              </h2>
              {s.blocks.map((b, j) => (Array.isArray(b)
                ? <ul key={j}>{b.map(item => <li key={item}><Inline text={item} /></li>)}</ul>
                : <p key={j}><Inline text={b} /></p>))}
            </section>
          ))}

          <p className={styles.other}>See also the <Link to={other.to}>{other.label}</Link>.</p>
        </article>
      </div>
    </section>
  )
}

export function Privacy() {
  return <Legal build={privacyPolicy} other={{ to: '/terms', label: 'terms of use' }} />
}

export function Terms() {
  return <Legal build={termsOfUse} other={{ to: '/privacy', label: 'privacy policy' }} />
}
