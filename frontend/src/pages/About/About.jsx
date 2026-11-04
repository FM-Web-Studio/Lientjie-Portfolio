import { useEffect, useState } from 'react'
import { subscribeBioSection } from '../../firebase'
import { Figure, Reveal } from '../../components'
import { useInView } from '../../hooks'
import { useContent } from '../../context/ContentContext'
import styles from './About.module.css'

// The bio documents, each on its own live listener.
const BIO_SECTIONS = ['profile', 'education', 'experience', 'achievements', 'skills']

/*
 * A link typed into the admin panel is usually written the way it is spoken -
 * "lientjiepetsitting.co.za", no scheme. Handed to href verbatim that is a
 * RELATIVE path, so the browser resolves it against this site and the link
 * lands on a 404 instead of the other site. Anything without a scheme (and
 * that is not a mailto/tel or a deliberate root-relative path) gets https://.
 */
function externalHref(raw) {
  const url = (raw ?? '').trim()
  if (!url) return null
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url
  if (url.startsWith('/')) return url
  return `https://${url}`
}

/** The bare domain, for display - a full URL as link text reads as clutter. */
function linkLabel(href) {
  try {
    return new URL(href, window.location.origin).hostname.replace(/^www\./, '')
  } catch {
    return href
  }
}

/** Numbered section opener, matching the home page. */
function Marker({ num, children }) {
  return (
    <p className="marker">
      <span className="marker-num">{num}</span>
      <span>{children}</span>
    </p>
  )
}

/**
 * One entry in a ruled timeline. The period sits in the left columns as
 * metadata and the substance sits to its right, so the whole section reads as
 * an index rather than as a stack of cards.
 */
function Entry({ period, role, place, description, link, index }) {
  const href = externalHref(link)

  return (
    <Reveal className={styles.entry} variant="rise-sm" index={index} amount={0.2}>
      <p className={styles.entryPeriod}>{period}</p>
      <div className={styles.entryBody}>
        <h3 className={styles.entryRole}>{role}</h3>
        {place && <p className={styles.entryPlace}>{place}</p>}
        {description && <p className={styles.entryDesc}>{description}</p>}
        {href && (
          /* Its own line rather than a linked heading: the heading is the role,
             and a reader scanning the timeline should be able to see that a
             link exists without hovering every title to find out. */
          <p className={styles.entryLinkRow}>
            <a
              className={styles.entryLink}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${linkLabel(href)} (opens in a new tab)`}
            >
              {linkLabel(href)}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 17 17 7" />
                <path d="M8 7h9v9" />
              </svg>
            </a>
          </p>
        )}
      </div>
    </Reveal>
  )
}

/**
 * A skill and its level. The bar fills once in view.
 *
 * `level` is clamped: it comes from an admin free-text number field, and a
 * value above 100 would push the fill past its track and out of the column.
 */
function Skill({ label, level }) {
  const [ref, inView] = useInView(0.2)
  const pct = Math.max(0, Math.min(100, Number(level) || 0))

  return (
    <div className={styles.skill} ref={ref}>
      <div className={styles.skillHead}>
        <span className={styles.skillLabel}>{label}</span>
        <span className={styles.skillPct}>{pct}</span>
      </div>
      <div className={styles.skillTrack}>
        <span
          className={styles.skillFill}
          style={{ width: inView ? `${pct}%` : '0%' }}
        />
      </div>
    </div>
  )
}

export default function About() {
  const { copy } = useContent()
  const t = copy('about')
  const info = copy('contact')

  const [bio, setBio] = useState({})
  const [loading, setLoading] = useState(true)

  /*
   * One listener per bio document. The loading flag clears once every one has
   * reported at least once, tracked with a Set of section names rather than a
   * counter: a listener that fires twice before its siblings fire at all -
   * which happens whenever one document is edited during first paint - would
   * push a counter to 4 early and reveal the page with empty sections.
   */
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

  /* Falls back to the editable copy defaults rather than to a skeleton. The
     name and title can therefore be rendered on the very first paint, which
     keeps the header the same height before and after the bio snapshot lands
     - swapping a placeholder for a two-line name grew the header and shoved
     the page down, measured at CLS 0.085 on this route. */
  const name  = profile?.name  ?? t.fallbackName
  const title = profile?.title ?? t.fallbackTitle

  const eduItems = education?.items ?? []
  const expItems = experience?.items ?? []
  const achItems = achievements?.items ?? []
  const skillCats = skills?.categories ?? []

  /* Sections are numbered in the order they actually render, so hiding
     Experience does not leave a gap where "03" should be. */
  const present = [
    { id: 'profile',   label: t.sectionProfile,    show: true },
    { id: 'education', label: t.sectionEducation,  show: loading || eduItems.length > 0 },
    { id: 'experience',label: t.sectionExperience, show: loading || expItems.length > 0 },
    /* Unlike the others this one is hidden while loading too: it is new, so
       most visits have no achievements document at all, and reserving a
       numbered slot for it would renumber Skills the moment the snapshot
       landed empty. */
    { id: 'achievements', label: t.sectionAchievements, show: achItems.length > 0 },
    { id: 'skills',    label: t.sectionSkills,     show: loading || skillCats.length > 0 },
  ].filter(s => s.show)

  const numOf = id => {
    const i = present.findIndex(s => s.id === id)
    return i === -1 ? '' : String(i + 1).padStart(2, '0')
  }
  const shows = id => present.some(s => s.id === id)

  const details = [
    info.email    && { key: 'Email',    value: info.email, href: `mailto:${info.email}` },
    info.phone    && { key: 'Phone',    value: info.phone, href: `tel:${info.phone.replace(/\s+/g, '')}` },
    info.location && { key: 'Location', value: info.location },
    info.instagram && {
      key: 'Instagram',
      value: info.instagramLabel || 'Instagram',
      href: info.instagram,
      external: true,
    },
  ].filter(Boolean)

  return (
    <>
      {/* ════ HEADER ════════════════════════════════════════════════════════
          Name on the left holding the gutter; portrait running off the right
          edge of the viewport. */}
      <header className={`tone-base ${styles.head}`}>
        <div className={styles.headGrid}>
          <Reveal className={styles.headType} variant="rise">
            <p className={styles.eyebrow}>{t.eyebrow}</p>
            <h1 className={styles.name}>
              {/* Split on the first space so a two-part name sets as two
                  lines; a single-word name still renders correctly. */}
              <em>{name.split(' ')[0]}</em>
              {name.split(' ').slice(1).join(' ') && (
                <span className={styles.nameLast}>
                  {name.split(' ').slice(1).join(' ')}
                  <span className="dot">.</span>
                </span>
              )}
            </h1>
            <p className={styles.role}>{title}</p>
          </Reveal>

          <Reveal className={styles.headMedia} variant="fade" amount={0.1}>
            <Figure
              src={profile?.profileImage}
              alt={name}
              ratio="3 / 4"
              label={title}
              priority
            />
          </Reveal>
        </div>
      </header>

      {/* ════ PROFILE ═══════════════════════════════════════════════════════ */}
      <section className={`section tone-accent-soft ${styles.section}`}>
        <div className="grid12">
          <Reveal className={styles.marker} variant="rise-sm">
            <Marker num={numOf('profile')}>{t.sectionProfile}</Marker>
          </Reveal>

          <Reveal className={styles.profileBody} variant="rise">
            {loading ? (
              <div className={styles.skelStack} aria-hidden="true">
                {[96, 92, 88, 94, 72].map((w, i) => (
                  <span key={i} className={styles.skelLine} style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : (
              <p className={styles.bio}>{profile?.bio}</p>
            )}
          </Reveal>

          <Reveal className={styles.profileRail} variant="rise-sm" index={1}>
            <dl className={styles.details}>
              {details.map(d => (
                <div key={d.key} className={styles.detail}>
                  <dt className={styles.detailKey}>{d.key}</dt>
                  <dd className={styles.detailVal}>
                    {d.href ? (
                      <a
                        href={d.href}
                        className={styles.detailLink}
                        {...(d.external
                          ? { target: '_blank', rel: 'noopener noreferrer' }
                          : {})}
                      >
                        {d.value}
                      </a>
                    ) : d.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* ════ EDUCATION ═════════════════════════════════════════════════════ */}
      {shows('education') && (
        <section className={`section tone-base ${styles.sectionAlt}`}>
          <div className="grid12">
            <Reveal className={styles.marker} variant="rise-sm">
              <Marker num={numOf('education')}>{t.sectionEducation}</Marker>
            </Reveal>
            <div className={styles.timeline}>
              {loading
                ? Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className={styles.entry} aria-hidden="true">
                      <span className={styles.skelLine} style={{ width: '60%' }} />
                      <div className={styles.entryBody}>
                        <span className={styles.skelLine} style={{ width: '55%', height: '1.4rem' }} />
                        <span className={styles.skelLine} style={{ width: '35%' }} />
                      </div>
                    </div>
                  ))
                : eduItems.map((item, i) => (
                    <Entry
                      key={`${item.period}-${item.degree}`}
                      index={i}
                      period={item.period}
                      role={item.degree}
                      place={item.institution}
                      description={item.description}
                    />
                  ))}
            </div>
          </div>
        </section>
      )}

      {/* ════ EXPERIENCE ════════════════════════════════════════════════════ */}
      {shows('experience') && (
        <section className={`section tone-accent ${styles.section}`}>
          <div className="grid12">
            <Reveal className={styles.marker} variant="rise-sm">
              <Marker num={numOf('experience')}>{t.sectionExperience}</Marker>
            </Reveal>
            <div className={styles.timeline}>
              {expItems.map((item, i) => (
                <Entry
                  key={`${item.period}-${item.role}`}
                  index={i}
                  period={item.period}
                  role={item.role}
                  place={item.company}
                  description={item.description}
                  link={item.link}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ════ ACHIEVEMENTS ══════════════════════════════════════════════════
          On the plain ground rather than a colour band: it sits between the
          mint Experience section and the deep Skills section, so a third
          colour in a row would leave no quiet step anywhere on the page. */}
      {shows('achievements') && (
        <section className={`section tone-base ${styles.sectionAlt}`}>
          <div className="grid12">
            <Reveal className={styles.marker} variant="rise-sm">
              <Marker num={numOf('achievements')}>{t.sectionAchievements}</Marker>
            </Reveal>
            <div className={styles.timeline}>
              {achItems.map((item, i) => (
                <Entry
                  key={`${item.period}-${item.title}`}
                  index={i}
                  period={item.period}
                  role={item.title}
                  place={item.issuer}
                  description={item.description}
                  link={item.link}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ════ SKILLS ════════════════════════════════════════════════════════ */}
      {shows('skills') && (
        <section className={`section tone-accent-deep ${styles.sectionAlt}`}>
          <div className="grid12">
            <Reveal className={styles.marker} variant="rise-sm">
              <Marker num={numOf('skills')}>{t.sectionSkills}</Marker>
            </Reveal>

            <div className={styles.skillsGrid}>
              {skillCats.map((cat, i) => (
                <Reveal
                  key={cat.name}
                  className={styles.skillCat}
                  variant="rise-sm"
                  index={i}
                >
                  <p className={styles.skillCatName}>{cat.name}</p>
                  <div className={styles.skillList}>
                    {(cat.items ?? []).map(sk => (
                      <Skill key={sk.label} label={sk.label} level={sk.level} />
                    ))}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
