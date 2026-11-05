import { useEffect, useRef, useState } from 'react'
import { subscribeBioSection } from '../../firebase'
import { Figure, Reveal, CvButton, TextReveal, ArrowUpRight } from '../../components'
import { scrollToTarget } from '../../hooks'
import useTilt from '../../hooks/useTilt'
import { useContent } from '../../context/ContentContext'
import { ScrollTrigger, useGSAP } from '../../lib/motion'
import styles from './About.module.css'
import { toneFor } from '../../lib/tone'

// The bio documents, each on its own live listener.
const BIO_SECTIONS = ['profile', 'education', 'experience', 'achievements', 'skills']

// Admin links are often typed without a scheme ("site.co.za"), which href would treat as a relative path.
function externalHref(raw) {
  const url = (raw ?? '').trim()
  if (!url) return null
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url
  if (url.startsWith('/')) return url
  return `https://${url}`
}

// The bare domain, for display: a full URL as link text reads as clutter.
function linkLabel(href) {
  try {
    return new URL(href, window.location.origin).hostname.replace(/^www\./, '')
  } catch {
    return href
  }
}

const paragraphsOf = text => (text ?? '').split(/\n+/).map(p => p.trim()).filter(Boolean)

// One entry on a timeline: period, title and place, then the description.
function Entry({ period, title, place, description, link, index }) {
  const href = externalHref(link)
  return (
    <Reveal as="li" className={`card is-hoverable ${styles.entry}`} variant="rise-sm" index={index % 4} amount={0.2}>
      <span className={styles.entryDot} aria-hidden="true" />
      <div className={styles.entryHead}>
        {period && <span className="badge badge-mint">{period}</span>}
        <h3 className={styles.entryTitle}>{title}</h3>
        {place && <p className={styles.entryPlace}>{place}</p>}
      </div>
      {(description || href) && (
        <div className={styles.entryBody}>
          {description && <p className={styles.entryText}>{description}</p>}
          {href && (
            <a
              className={`link ${styles.entryLink}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${linkLabel(href)} (opens in a new tab)`}
              data-cursor="open"
            >
              {linkLabel(href)}
              <ArrowUpRight size={12} />
            </a>
          )}
        </div>
      )}
    </Reveal>
  )
}

function EntrySkeleton() {
  return (
    <li className={`card ${styles.entry}`} aria-hidden="true">
      <div className={styles.entryHead}>
        <span className={`skeleton ${styles.skelPill}`} />
        <span className={`skeleton ${styles.skelLine}`} style={{ width: '70%', height: 22 }} />
        <span className={`skeleton ${styles.skelLine}`} style={{ width: '45%' }} />
      </div>
      <div className={styles.entryBody}>
        <span className={`skeleton ${styles.skelLine}`} style={{ width: '90%' }} />
        <span className={`skeleton ${styles.skelLine}`} style={{ width: '65%' }} />
      </div>
    </li>
  )
}

function Section({ id, label, count, children }) {
  return (
    <section id={`about-${id}`} className={styles.sec} aria-labelledby={`about-${id}-h`}>
      <div className={styles.secHead}>
        <TextReveal as="h2" id={`about-${id}-h`} className={styles.h2}>{label}</TextReveal>
        {count > 0 && <span className={`badge ${styles.count}`}>{count}</span>}
      </div>
      {children}
    </section>
  )
}

// The portrait in a rounded frame that leans toward the pointer.
function Portrait({ src, alt, label }) {
  const ref = useRef(null)
  useTilt(ref, 4)
  return (
    <div ref={ref} className={styles.portrait}>
      <Figure src={src} alt={alt} ratio="4 / 5" label={label} priority />
      <span className={styles.glare} aria-hidden="true" />
    </div>
  )
}

export default function About() {
  const { copy } = useContent()
  const t = copy('about')
  const info = copy('contact')

  const [bio, setBio] = useState({})
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState('profile')
  const root = useRef(null)

  // Loading clears once every listener has reported, tracked by name so a listener firing twice cannot end it early.
  useEffect(() => {
    const seen = new Set()
    const markSeen = section => {
      seen.add(section)
      if (seen.size === BIO_SECTIONS.length) setLoading(false)
    }

    const unsubs = BIO_SECTIONS.map(section =>
      subscribeBioSection(
        section,
        data => { setBio(prev => ({ ...prev, [section]: data })); markSeen(section) },
        err  => { console.error(`[About] ${section} failed:`, err); markSeen(section) },
      ),
    )
    return () => unsubs.forEach(u => u && u())
  }, [])

  const { profile, education, experience, achievements, skills } = bio

  // Copy defaults keep the header the same height before and after the bio snapshot lands.
  const name  = profile?.name  ?? t.fallbackName
  const title = profile?.title ?? t.fallbackTitle
  const paras = paragraphsOf(profile?.bio)
  const [lead, ...more] = paras

  const eduItems = education?.items ?? []
  const expItems = experience?.items ?? []
  const achItems = achievements?.items ?? []
  const skillCats = skills?.categories ?? []

  // Achievements stays hidden while loading because most visits have none.
  const present = [
    { id: 'profile',      label: t.sectionProfile,      show: true },
    { id: 'education',    label: t.sectionEducation,    show: loading || eduItems.length > 0 },
    { id: 'experience',   label: t.sectionExperience,   show: loading || expItems.length > 0 },
    { id: 'achievements', label: t.sectionAchievements, show: achItems.length > 0 },
    { id: 'skills',       label: t.sectionSkills,       show: loading || skillCats.length > 0 },
  ].filter(s => s.show)
  const presentKey = present.map(s => s.id).join(',')
  const shows = id => present.some(s => s.id === id)

  // Strongest skills first within each group; the level itself is never shown.
  const skillGroups = skillCats.map(cat => ({
    name: cat.name,
    items: [...(cat.items ?? [])].sort((a, b) => (Number(b.level) || 0) - (Number(a.level) || 0)),
  }))

  const details = [
    info.email    && { key: 'Email',    value: info.email, href: `mailto:${info.email}` },
    info.phone    && { key: 'Phone',    value: info.phone, href: `tel:${info.phone.replace(/\s+/g, '')}` },
    info.location && { key: 'Location', value: info.location },
    info.instagram && { key: 'Instagram', value: info.instagramLabel || 'Instagram', href: info.instagram, external: true },
  ].filter(Boolean)

  // Marks the section being read in the side nav.
  useGSAP(() => {
    const triggers = present.map(s => {
      const el = document.getElementById(`about-${s.id}`)
      return el && ScrollTrigger.create({
        trigger: el,
        start: 'top 40%',
        end: 'bottom 40%',
        onToggle: self => { if (self.isActive) setActive(s.id) },
      })
    })
    ScrollTrigger.refresh()
    return () => triggers.forEach(tr => tr && tr.kill())
  }, { scope: root, dependencies: [loading, presentKey], revertOnUpdate: true })

  const goTo = (e, id) => {
    e.preventDefault()
    const el = document.getElementById(`about-${id}`)
    if (el) scrollToTarget(el, { offset: -96 })
  }

  return (
    <div ref={root}>
      {/* ── Intro ── */}
      <header className={`container ${styles.hero}`}>
        <div className={styles.heroText}>
          <Reveal variant="rise-sm"><span className="badge badge-dot">{t.eyebrow}</span></Reveal>
          {loading ? (
            <h1 className={styles.name}>{name}<span className="dot">.</span></h1>
          ) : (
            <TextReveal key={name} as="h1" by="words" trigger="mount" className={styles.name}>
              {name}<span className="dot">.</span>
            </TextReveal>
          )}
          <Reveal variant="rise-sm" index={1}><span className="badge badge-accent">{title}</span></Reveal>
          {loading ? (
            <div className={styles.leadSkel} aria-hidden="true">
              {[96, 90, 70].map((w, i) => <span key={i} className={`skeleton ${styles.skelLine}`} style={{ width: `${w}%` }} />)}
            </div>
          ) : lead && (
            <Reveal as="p" variant="rise" index={2} className={styles.lead}>{lead}</Reveal>
          )}
          <Reveal variant="rise" index={3}><CvButton variant="accent" size="lg" /></Reveal>
        </div>
        <Reveal variant="scale-in" index={1} className={styles.heroArt}>
          <Portrait src={profile?.profileImage} alt={name} label={title} />
        </Reveal>
      </header>

      <div className={`container ${styles.layout}`}>
        <nav className={styles.nav} aria-label="On this page">
          <ol className={styles.navList}>
            {present.map(s => (
              <li key={s.id}>
                <a
                  href={`#about-${s.id}`}
                  className={styles.navLink}
                  aria-current={active === s.id ? 'true' : undefined}
                  onClick={e => goTo(e, s.id)}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className={styles.content}>
          {/* ── Profile: the rest of the bio and the ways to reach her ── */}
          <Section id="profile" label={t.sectionProfile}>
            {more.length > 0 && (
              <div className={styles.bio}>
                {more.map((p, i) => <Reveal as="p" key={i} variant="rise-sm" index={i}>{p}</Reveal>)}
              </div>
            )}
            {details.length > 0 && (
              <dl className={styles.details}>
                {details.map((d, i) => (
                  <Reveal key={d.key} className={`card ${styles.detail}`} variant="rise-sm" index={i}>
                    <dt className={styles.detailKey}>{d.key}</dt>
                    <dd className={styles.detailVal}>
                      {d.href ? (
                        <a
                          href={d.href}
                          className="link"
                          {...(d.external ? { target: '_blank', rel: 'noopener noreferrer', 'data-cursor': 'open' } : {})}
                        >
                          {d.value}
                        </a>
                      ) : d.value}
                    </dd>
                  </Reveal>
                ))}
              </dl>
            )}
          </Section>

          {shows('education') && (
            <Section id="education" label={t.sectionEducation} count={eduItems.length}>
              <ol className={styles.timeline}>
                {loading
                  ? [0, 1].map(i => <EntrySkeleton key={i} />)
                  : eduItems.map((item, i) => (
                      <Entry
                        key={`${i}-${item.period}-${item.degree}`}
                        index={i}
                        period={item.period}
                        title={item.degree}
                        place={item.institution}
                        description={item.description}
                      />
                    ))}
              </ol>
            </Section>
          )}

          {shows('experience') && (
            <Section id="experience" label={t.sectionExperience} count={expItems.length}>
              <ol className={styles.timeline}>
                {loading
                  ? [0, 1].map(i => <EntrySkeleton key={i} />)
                  : expItems.map((item, i) => (
                      <Entry
                        key={`${i}-${item.period}-${item.role}`}
                        index={i}
                        period={item.period}
                        title={item.role}
                        place={item.company}
                        description={item.description}
                        link={item.link}
                      />
                    ))}
              </ol>
            </Section>
          )}

          {shows('achievements') && (
            <Section id="achievements" label={t.sectionAchievements} count={achItems.length}>
              <ol className={styles.timeline}>
                {achItems.map((item, i) => (
                  <Entry
                    key={`${i}-${item.period}-${item.title}`}
                    index={i}
                    period={item.period}
                    title={item.title}
                    place={item.issuer}
                    description={item.description}
                    link={item.link}
                  />
                ))}
              </ol>
            </Section>
          )}

          {shows('skills') && (
            <Section id="skills" label={t.sectionSkills}>
              <div className={styles.groups}>
                {loading
                  ? [0, 1].map(i => (
                      <div key={i} className={`card ${styles.group}`} aria-hidden="true">
                        <span className={`skeleton ${styles.skelLine}`} style={{ width: '40%', height: 20 }} />
                        <div className={styles.pills}>
                          {[70, 90, 60, 80].map((w, j) => <span key={j} className={`skeleton ${styles.skelPill}`} style={{ width: w }} />)}
                        </div>
                      </div>
                    ))
                  : skillGroups.map((cat, i) => (
                      <Reveal key={`${i}-${cat.name}`} className={`card ${styles.group}`} variant="rise" index={i % 3}>
                        <h3 className={styles.groupName}>{cat.name}</h3>
                        <ul className={styles.pills}>
                          {cat.items.map((sk, j) => (
                            <li key={`${j}-${sk.label}`} className={`badge badge-${['mint', 'coral', 'peach'][i % 3]} ${styles.pill}`}>{sk.label}</li>
                          ))}
                        </ul>
                      </Reveal>
                    ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}
