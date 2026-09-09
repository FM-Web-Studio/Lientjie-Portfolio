import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { subscribeFeaturedProjects } from '../../firebase'
import {
  Figure, Reveal, ProjectBleed, ProjectBleedSkeleton, ProjectLightbox,
} from '../../components'
import { useContent } from '../../context/ContentContext'
import styles from './Home.module.css'

/* How many featured projects the home page carries as full-bleed rows.
   Four is the point where the page still reads as a selection rather than as
   the Work page duplicated; the rest live behind "All work". */
const FEATURED_COUNT = 4

function Arrow() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

/** Numbered section opener. This is what makes the page read as a sequence of
    named places rather than as one continuous scroll. */
function Marker({ num, children }) {
  return (
    <p className="marker">
      <span className="marker-num">{num}</span>
      <span>{children}</span>
    </p>
  )
}

export default function Home() {
  const { copy } = useContent()
  const t = copy('home')
  const info = copy('contact')

  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [active,   setActive]   = useState(null)

  /*
   * The quote is picked once per mount from whichever quote fields are
   * actually filled in. Indexing a fixed 1-5 range would leave a one-in-five
   * chance of rendering an empty blockquote with a stray attribution rule
   * whenever one of them is blanked in the admin panel.
   *
   * The empty dependency array is deliberate: re-rolling the quote whenever
   * the content document changes would swap it under the reader mid-scroll.
   */
  const quote = useMemo(() => {
    const filled = [1, 2, 3, 4, 5]
      .map(i => ({ text: t[`quote${i}Text`], author: t[`quote${i}Author`] }))
      .filter(q => q.text?.trim())
    if (filled.length === 0) return null
    return filled[Math.floor(Math.random() * filled.length)]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Live subscription rather than a one-shot read, so an admin reordering,
  // hiding or re-flagging a project sees the page update without a reload.
  useEffect(() => {
    const unsubscribe = subscribeFeaturedProjects(
      items => { setProjects(items.slice(0, FEATURED_COUNT)); setLoading(false) },
      err   => { console.error('[Home] featured projects failed:', err); setLoading(false) },
      FEATURED_COUNT,
    )
    return unsubscribe
  }, [])

  /* The hero background is an explicit, optional choice (Admin → Site Copy →
     Home → "Hero background image"), NOT the first project's cover.
     Auto-using a cover was tried and abandoned: the covers are presentation
     sheets on white, and the hero's bone-white display type vanished against
     one while the sheet's own captions collided with it. With no image the
     hero is composed type on a ruled ground, which always reads. */
  const heroImage = t.heroImage?.trim() || ''

  const STATS = [
    { value: t.stat1Value, label: t.stat1Label },
    { value: t.stat2Value, label: t.stat2Label },
    { value: t.stat3Value, label: t.stat3Label },
  ]

  const PROCESS = [
    { num: '01', title: t.process1Title, body: t.process1Body },
    { num: '02', title: t.process2Title, body: t.process2Body },
    { num: '03', title: t.process3Title, body: t.process3Body },
    { num: '04', title: t.process4Title, body: t.process4Body },
  ]

  return (
    <>
      {/* ════ HERO ══════════════════════════════════════════════════════════
          Full-viewport, full-bleed photograph with the name set over its
          lower-left. Nothing is centred: the type sits on the page gutter and
          the metadata rail sits against the opposite edge. */}
      <section
        className={`${styles.hero} ${heroImage ? '' : styles.heroBare}`}
        /* Lets the nav float over this section transparently, and tells it
           what is underneath: with an image the hero lays a dark scrim in BOTH
           themes, so the bar needs fixed light type; without one the ground is
           the theme's own surface and theme colours are already correct. */
        data-nav-overlay={heroImage ? 'scrim' : 'ground'}
      >
        <div className={styles.heroMedia} aria-hidden="true">
          {heroImage ? (
            <>
              <Figure
                src={heroImage}
                alt=""
                ratio="auto"
                priority
                className={styles.heroFigure}
              />
              <span className={styles.heroScrim} />
            </>
          ) : (
            /* Ruled drafting ground. Two repeating gradients rather than an
               asset: no request, and it scales with the viewport for free. */
            <span className={styles.heroGrid} />
          )}
        </div>

        <div className={styles.heroContent}>
          <div className={styles.heroType}>
            <p className={styles.heroEyebrow}>{t.heroEyebrow}</p>
            <h1 className={styles.heroName}>
              <em>{t.heroNameFirst}</em>
              <span className={styles.heroLast}>
                {t.heroNameLast}<span className="dot">.</span>
              </span>
            </h1>
            <p className={styles.heroBio}>{t.heroBio}</p>

            <div className={styles.heroActions}>
              <Link to="/work" className={`btn btn-accent ${styles.heroBtn}`}>
                {t.heroCtaPrimary}<Arrow />
              </Link>
              <Link to="/about" className={`btn ${styles.heroBtnGhost}`}>
                {t.heroCtaSecondary}
              </Link>
            </div>
          </div>

          {/* Metadata rail, pinned against the opposite edge. Hidden below the
              grid breakpoint, where there is no room for a second column. */}
          <dl className={styles.heroRail}>
            {info.location && (
              <div className={styles.railItem}>
                <dt className={styles.railKey}>Based in</dt>
                <dd className={styles.railVal}>{info.location}</dd>
              </div>
            )}
            <div className={styles.railItem}>
              <dt className={styles.railKey}>Status</dt>
              <dd className={styles.railVal}>Open to placements</dd>
            </div>
          </dl>
        </div>

        <span className={`cue ${styles.heroCue}`} aria-hidden="true">Scroll</span>
      </section>


      {/* ════ 01 - STATEMENT ════════════════════════════════════════════════
          One large statement, set on the grid from column 4 so it is
          emphatically not centred, with the facts row as a ruled band under
          it. */}
      <section className={`section tone-accent-soft ${styles.statement}`}>
        <div className="grid12">
          <Reveal className={styles.statementMarker} variant="rise-sm">
            <Marker num="01">{t.aboutEyebrow}</Marker>
          </Reveal>

          <Reveal className={styles.statementBody} variant="rise">
            <h2 className={styles.statementHead}>{t.aboutHeading}</h2>
            <p className={styles.statementText}>{t.aboutBody}</p>
            <Link to="/about" className={`link ${styles.statementLink}`}>
              {t.aboutCta}
            </Link>
          </Reveal>
        </div>

        <div className={`grid12 ${styles.facts}`}>
          {STATS.map((s, i) => (
            <Reveal key={s.label} className={styles.fact} variant="rise-sm" index={i}>
              <span className={styles.factValue}>{s.value}</span>
              <span className={styles.factLabel}>{s.label}</span>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ════ 02 - SELECTED WORK ════════════════════════════════════════════
          The core of the layout: alternating full-bleed rows. */}
      <section className={`tone-base ${styles.work}`}>
        <div className={`grid12 ${styles.workHead}`}>
          <Reveal className={styles.workHeadMarker} variant="rise-sm">
            <Marker num="02">{t.workEyebrow}</Marker>
          </Reveal>
          <Reveal className={styles.workHeadTitle} variant="rise">
            <h2 className={styles.sectionTitle}>{t.workTitle}</h2>
          </Reveal>
          <Reveal className={styles.workHeadLink} variant="rise-sm">
            <Link to="/work" className={`link ${styles.workLink}`}>
              {t.workLink}<Arrow />
            </Link>
          </Reveal>
        </div>

        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <ProjectBleedSkeleton key={i} index={i} />
          ))
        ) : projects.length === 0 ? (
          <div className="grid12">
            <p className={styles.empty}>
              No featured projects yet. Flag a project as featured in the admin
              panel and it will appear here.
            </p>
          </div>
        ) : (
          projects.map((p, i) => (
            <ProjectBleed
              key={p.id}
              project={p}
              index={i}
              onOpen={setActive}
            />
          ))
        )}
      </section>

      {/* ════ 03 - APPROACH ═════════════════════════════════════════════════
          Four numbered columns on a ruled grid. Each cell is top-ruled, so the
          section reads as a table of contents rather than as four cards. */}
      <section className={`section tone-accent ${styles.approach}`}>
        <div className="grid12">
          <Reveal className={styles.approachMarker} variant="rise-sm">
            <Marker num="03">{t.processEyebrow}</Marker>
          </Reveal>
          <Reveal className={styles.approachTitle} variant="rise">
            <h2 className={styles.sectionTitle}>{t.processTitle}</h2>
          </Reveal>
        </div>

        <div className={`grid12 ${styles.approachGrid}`}>
          {PROCESS.map((p, i) => (
            <Reveal key={p.num} className={styles.step} variant="rise" index={i}>
              <span className={styles.stepNum}>{p.num}</span>
              <h3 className={styles.stepTitle}>{p.title}</h3>
              <p className={styles.stepBody}>{p.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ════ QUOTE ═════════════════════════════════════════════════════════
          An unnumbered full-bleed interlude between sections. Inverted, so it
          breaks the vertical rhythm without introducing another colour. */}
      {quote && (
        <section className={`tone-invert ${styles.band}`}>
          <div className="grid12">
            <Reveal className={styles.bandInner} variant="rise">
              <blockquote className={styles.quote}>{quote.text}</blockquote>
              {quote.author && (
                <p className={styles.quoteBy}>
                  <span className={styles.quoteRule} aria-hidden="true" />
                  {quote.author}
                </p>
              )}
            </Reveal>
          </div>
        </section>
      )}

      {/* ════ 04 - CONTACT ══════════════════════════════════════════════════ */}
      <section className={`section tone-accent-deep ${styles.cta}`}>
        <div className="grid12">
          <Reveal className={styles.ctaMarker} variant="rise-sm">
            <Marker num="04">{t.contactEyebrow}</Marker>
          </Reveal>

          <Reveal className={styles.ctaBody} variant="rise">
            <h2 className={styles.ctaHead}>{t.contactHeading}</h2>
            <Link to="/contact" className={`btn btn-accent ${styles.ctaBtn}`}>
              {t.contactCta}<Arrow />
            </Link>
          </Reveal>

          <Reveal className={styles.ctaRail} variant="rise-sm" index={1}>
            {info.email && (
              <a href={`mailto:${info.email}`} className={styles.ctaMeta}>
                {info.email}
              </a>
            )}
            {info.responseTime && (
              <p className={styles.ctaMetaDim}>
                Replies {info.responseTime.toLowerCase()}
              </p>
            )}
          </Reveal>
        </div>
      </section>

      {active && <ProjectLightbox project={active} onClose={() => setActive(null)} />}
    </>
  )
}
