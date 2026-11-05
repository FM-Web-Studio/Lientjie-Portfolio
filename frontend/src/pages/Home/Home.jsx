import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { subscribeFeaturedProjects } from '../../firebase'
import {
  Button, Counter, Marquee, Reveal, TextReveal, Figure, ProjectLightbox, ArrowRight, ArrowUpRight,
} from '../../components'
import useTilt from '../../hooks/useTilt'
import { useContent } from '../../context/ContentContext'
import styles from './Home.module.css'
import { toneFor } from '../../lib/tone'
import { whenSettled } from '../../lib/motion'

const FEATURED_COUNT = 4
// The 3D model is its own download, fetched only when the home page shows.
const Hero3D = lazy(() => import('./Hero3D'))

// A project as a rounded card that tilts toward the pointer.
function ProjectCard({ project, index, onOpen }) {
  const ref = useRef(null)
  useTilt(ref, 4)
  return (
    <Reveal variant="flip-up" index={index % 2} className={styles.cardWrap}>
      <button
        ref={ref}
        type="button"
        className={styles.card}
        onClick={(e) => onOpen(project, e.currentTarget.querySelector('img')?.getBoundingClientRect())}
        data-cursor="view"
        aria-label={`Open ${project.title}`}
      >
        <span className={styles.cardMedia}>
          <span className={styles.cardZoom}>
            <Figure src={project.coverImage} alt="" ratio="4 / 3" label={project.title} priority={index < 2} className={styles.cardFig} />
          </span>
          <span className={styles.glare} aria-hidden="true" />
        </span>
        <span className={styles.cardBody}>
          <span className={styles.cardText}>
            <span className={styles.cardTitle}>{project.title}</span>
            <span className={styles.cardMeta}>
              {project.category && <span className={`badge badge-${toneFor(project.category)}`}>{project.category}</span>}
              {project.year && <span className={styles.cardYear}>{project.year}</span>}
            </span>
          </span>
          <span className={styles.cardArrow} aria-hidden="true"><ArrowUpRight size={16} /></span>
        </span>
      </button>
    </Reveal>
  )
}

function CardSkeleton() {
  return (
    <div className={styles.cardWrap} aria-hidden="true">
      <span className={`skeleton ${styles.skelMedia}`} />
      <span className="skeleton" style={{ width: '45%', height: 18, marginTop: 16 }} />
    </div>
  )
}

// The hero's little stack of project photos, fanned like prints on a desk.
function PhotoStack({ projects, onOpen }) {
  const shots = projects.filter(p => p.coverImage).slice(0, 3)
  if (shots.length === 0) return <div className={`${styles.stack} ${styles.stackEmpty}`} aria-hidden="true" />
  return (
    <div className={styles.stack}>
      {shots.map((p, i) => (
        <button
          key={p.id}
          type="button"
          className={styles.print}
          style={{ '--i': i }}
          onClick={(e) => onOpen(p, e.currentTarget.getBoundingClientRect())}
          data-cursor="view"
          aria-label={`Open ${p.title}`}
        >
          <Figure src={p.coverImage} alt="" ratio="4 / 5" label={p.title} priority className={styles.printFig} />
          <span className={styles.printLabel}>{p.title}</span>
        </button>
      ))}
    </div>
  )
}

export default function Home() {
  const { copy } = useContent()
  const t = copy('home')
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null)

  // Picked once per mount from the filled quotes, so it never swaps mid-read.
  const quote = useMemo(() => {
    const filled = [1, 2, 3, 4, 5]
      .map(i => ({ text: t[`quote${i}Text`], author: t[`quote${i}Author`] }))
      .filter(q => q.text?.trim())
    return filled.length ? filled[Math.floor(Math.random() * filled.length)] : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => subscribeFeaturedProjects(
    items => { setProjects(items.slice(0, FEATURED_COUNT)); setLoading(false) },
    err => { console.error('[Home] featured projects failed:', err); setLoading(false) },
    FEATURED_COUNT,
  ), [])

  const open = (project, origin) => setActive({ project, origin })
  // Without WebGL the hero falls back to the stack of project prints.
  const [no3d, setNo3d] = useState(false)
  // Starting the 3D engine blocks the page for a moment, so it waits until the opening has played.
  const [show3d, setShow3d] = useState(false)
  useEffect(() => whenSettled(() => setShow3d(true)), [])
  const fallBack = useCallback(() => setNo3d(true), [])
  const stats = [1, 2, 3].map(i => ({ value: t[`stat${i}Value`], label: t[`stat${i}Label`] })).filter(s => s.value)
  const steps = [1, 2, 3, 4].map(i => ({ title: t[`process${i}Title`], body: t[`process${i}Body`] })).filter(s => s.title)
  const words = [...new Set([...steps.map(s => s.title), 'Open to placements', t.heroEyebrow].filter(Boolean))]

  return (
    <>
      {/* ── Hero ── */}
      <section className={`container ${styles.hero}`}>
        <div className={styles.heroText}>
          <Reveal variant="rise-sm"><span className="badge badge-dot">Open to placements</span></Reveal>
          <TextReveal as="h1" by="words" trigger="mount" className={styles.heroTitle}>
            {t.heroNameFirst} <span className="text-gradient">{t.heroNameLast}</span><span className={styles.heroDot}>.</span>
          </TextReveal>
          <Reveal variant="rise" index={2}><p className={styles.heroBio}>{t.heroBio}</p></Reveal>
          <Reveal variant="rise" index={3} className={styles.heroActions}>
            <Button to="/work" variant="accent" icon={<ArrowRight size={15} />}>{t.heroCtaPrimary}</Button>
            <Button to="/about">{t.heroCtaSecondary}</Button>
          </Reveal>
        </div>
        <div className={styles.heroArt}>
          {t.heroImage?.trim()
            ? <div className={styles.heroImage}><Figure src={t.heroImage.trim()} alt="" ratio="4 / 5" priority /></div>
            : no3d
              ? <PhotoStack projects={projects} onOpen={open} />
              : show3d
                ? <Suspense fallback={<div className={styles.stage} />}><Hero3D onUnavailable={fallBack} /></Suspense>
                : <div className={styles.stage} />}
        </div>
      </section>

      {/* ── A quiet moving line of what she works on ── */}
      <div className={styles.band} aria-hidden="true">
        <Marquee duration={40}>
          {words.map(w => <span key={w} className={styles.bandItem}><span className={styles.bandWord}>{w}</span><span className={styles.bandDot} /></span>)}
        </Marquee>
      </div>

      {/* ── Selected work ── */}
      <section className={`container section ${styles.work}`}>
        <div className={styles.head}>
          <div>
            <p className="eyebrow eyebrow-sky">{t.workEyebrow}</p>
            <TextReveal as="h2" className={styles.h2}>{t.workTitle}</TextReveal>
          </div>
          <Button to="/work" size="sm" icon={<ArrowRight size={14} />}>{t.workLink}</Button>
        </div>
        <div className={styles.grid}>
          {loading
            ? [0, 1].map(i => <CardSkeleton key={i} />)
            : projects.length === 0
              ? <p className={styles.empty}>No featured projects yet. Flag a project as featured in the admin and it will appear here.</p>
              : projects.map((p, i) => <ProjectCard key={p.id} project={p} index={i} onOpen={open} />)}
        </div>
      </section>

      {/* ── About ── */}
      <section className={`container section ${styles.about}`}>
        <div className={styles.aboutGrid}>
          <div>
            <p className="eyebrow eyebrow-coral">{t.aboutEyebrow}</p>
            <TextReveal as="h2" className={styles.h2}>{t.aboutHeading}</TextReveal>
          </div>
          <div className={styles.aboutBody}>
            <TextReveal as="p" className={styles.lead} delay={0.1}>{t.aboutBody}</TextReveal>
            <Reveal variant="rise-sm" index={2}><Button to="/about" icon={<ArrowRight size={14} />}>{t.aboutCta}</Button></Reveal>
          </div>
        </div>
        {stats.length > 0 && (
          <dl className={styles.stats}>
            {stats.map((s, i) => (
              <Reveal key={s.label || i} variant="flip-up" index={i} className={`card is-hoverable ${styles.stat}`}>
                <dd className={styles.statValue}><Counter value={s.value} /></dd>
                <dt className={styles.statLabel}>{s.label}</dt>
              </Reveal>
            ))}
          </dl>
        )}
      </section>

      {/* ── How I work ── */}
      {steps.length > 0 && (
        <section className={`container section ${styles.process}`}>
          <p className="eyebrow eyebrow-lavender">{t.processEyebrow}</p>
          <TextReveal as="h2" className={styles.h2}>{t.processTitle}</TextReveal>
          <ol className={styles.steps}>
            {steps.map((s, i) => (
              <Reveal as="li" key={s.title} variant="flip-up" index={i} className={`card ${styles.step}`} tabIndex={0} data-no-tilt>
                <span className={styles.stepNum}>{String(i + 1).padStart(2, '0')}</span>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepBody}>{s.body}</p>
              </Reveal>
            ))}
          </ol>
        </section>
      )}

      {/* ── A line to end on ── */}
      {quote && (
        <section className={`container section ${styles.quoteWrap}`}>
          <figure className={styles.quote}>
            <span className={styles.quoteMark} aria-hidden="true">&ldquo;</span>
            <TextReveal as="blockquote" by="words" className={styles.quoteText}>{quote.text}</TextReveal>
            {quote.author && <figcaption className={styles.quoteBy}>{quote.author}</figcaption>}
          </figure>
        </section>
      )}

      {active && <ProjectLightbox project={active.project} origin={active.origin} onClose={() => setActive(null)} />}
    </>
  )
}
