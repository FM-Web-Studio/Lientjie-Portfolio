import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Flip } from 'gsap/Flip'
import { subscribeProjects } from '../../firebase'
import { Reveal, Figure, ProjectLightbox, TextReveal, ArrowUpRight } from '../../components'
import useTilt from '../../hooks/useTilt'
import { useContent } from '../../context/ContentContext'
import { gsap, ScrollTrigger, reducedMotion, finePointer } from '../../lib/motion'
import styles from './Work.module.css'
import { toneFor } from '../../lib/tone'

gsap.registerPlugin(Flip)

const VIEW_KEY = 'lm-work-view'

const matches = (p, cat) => cat === 'All' || p.category?.toLowerCase() === cat.toLowerCase()

// A rounded card that tilts toward the pointer, like Home's project cards.
// data-flip-id sits on the wrapper so Flip and the tilt never fight over one transform.
function ProjectCard({ project, index, onOpen }) {
  const ref = useRef(null)
  useTilt(ref, 4)
  return (
    <div className={styles.cardWrap} data-flip-id={project.id}>
      <Reveal variant="rise" index={index % 3}>
        <button
          ref={ref}
          type="button"
          className={styles.card}
          onClick={e => onOpen(project, e.currentTarget.querySelector('figure')?.getBoundingClientRect())}
          data-cursor="view"
          aria-label={`Open ${project.title}`}
        >
          <span className={styles.cardMedia}>
            <span className={styles.cardZoom}>
              <Figure src={project.coverImage} alt="" ratio="4 / 3" label={project.title} priority={index < 3} className={styles.cardFig} />
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
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className={styles.cardWrap} aria-hidden="true">
      <span className={`skeleton ${styles.skelMedia}`} />
      <span className="skeleton" style={{ width: '55%', height: 18, marginTop: 16, borderRadius: 8 }} />
      <span className="skeleton" style={{ width: '30%', height: 14, marginTop: 10, borderRadius: 8 }} />
    </div>
  )
}

/* ── List view with a small floating preview that follows the pointer ── */
function ProjectList({ items, onOpen }) {
  const [hover, setHover] = useState(-1)
  const preview = useRef(null)
  const fine = useMemo(() => finePointer() && !reducedMotion(), [])

  useEffect(() => {
    const el = preview.current
    if (!fine || !el) return undefined
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' })
    const rTo = gsap.quickTo(el, 'rotation', { duration: 0.8, ease: 'power3.out' })
    let lastX = null
    const move = e => {
      xTo(e.clientX)
      yTo(e.clientY)
      // Leans a little into the direction of travel, then settles.
      if (lastX != null) rTo(gsap.utils.clamp(-6, 6, (e.clientX - lastX) * 0.5))
      lastX = e.clientX
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [fine])

  return (
    <>
      <ul className={styles.list} onPointerLeave={() => setHover(-1)}>
        {items.map((p, i) => (
          <li key={p.id} className={styles.listItem} data-flip-id={p.id}>
            <button
              type="button"
              className={styles.row}
              onClick={e => onOpen(p, e.currentTarget.getBoundingClientRect())}
              onPointerEnter={() => setHover(i)}
              data-cursor="view"
            >
              <span className={styles.rowThumb} aria-hidden="true">
                {p.coverImage ? <img src={p.coverImage} alt="" loading="lazy" decoding="async" /> : null}
              </span>
              <span className={styles.rowTitle}>{p.title}</span>
              <span className={styles.rowCat}>{p.category && <span className={`badge badge-${toneFor(p.category)}`}>{p.category}</span>}</span>
              <span className={styles.rowYear}>{p.year}</span>
              <span className={styles.rowArrow} aria-hidden="true"><ArrowUpRight size={15} /></span>
            </button>
          </li>
        ))}
      </ul>

      {/* Portalled, so no transformed ancestor can break position: fixed. */}
      {fine && createPortal(
        <div ref={preview} className={styles.preview} data-shown={hover >= 0 ? 'true' : 'false'} aria-hidden="true">
          <div className={styles.previewInner}>
            {items.map((p, i) => (
              <div key={p.id} className={styles.previewItem} data-on={i === hover ? 'true' : 'false'}>
                {p.coverImage
                  ? <img src={p.coverImage} alt="" decoding="async" loading="lazy" />
                  : <span className={styles.previewEmpty}>{p.title}</span>}
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

const GridIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
    <rect x="0" y="0" width="6" height="6" rx="1.5" /><rect x="8" y="0" width="6" height="6" rx="1.5" />
    <rect x="0" y="8" width="6" height="6" rx="1.5" /><rect x="8" y="8" width="6" height="6" rx="1.5" />
  </svg>
)
const ListIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
    <rect x="0" y="1" width="14" height="2.5" rx="1.25" /><rect x="0" y="5.75" width="14" height="2.5" rx="1.25" />
    <rect x="0" y="10.5" width="14" height="2.5" rx="1.25" />
  </svg>
)

export default function Work() {
  const { copy } = useContent()
  const t = copy('work')

  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('All')
  const [active,   setActive]   = useState(null)
  const [view, setView] = useState(() => {
    try { return localStorage.getItem(VIEW_KEY) === 'index' ? 'index' : 'grid' } catch { return 'grid' }
  })

  const resultsRef = useRef(null)
  const flipState = useRef(null)
  const busy = useRef(false)

  // Live, so an edit in the admin panel shows immediately. Hidden projects are
  // dropped inside subscribeProjects.
  useEffect(() => {
    const unsubscribe = subscribeProjects(
      items => { setProjects(items); setLoading(false) },
      err   => { console.error('[Work] projects failed:', err); setLoading(false) },
    )
    return unsubscribe
  }, [])

  /* The configured list sets order and spelling; any category a project uses is
     appended, matched case-insensitively, so an admin-invented one still gets a chip. */
  const CATS = useMemo(() => {
    const seen = new Map()
    const add = c => {
      const v = (c ?? '').trim()
      if (v && !seen.has(v.toLowerCase())) seen.set(v.toLowerCase(), v)
    }
    for (const c of (t.categories ?? '').split(',')) add(c)
    for (const p of projects) {
      const v = (p.category ?? '').trim()
      if (v) add(v.charAt(0).toUpperCase() + v.slice(1))
    }
    return ['All', ...seen.values()]
  }, [t.categories, projects])

  const counts = useMemo(() => {
    const out = {}
    for (const c of CATS) out[c] = projects.filter(p => matches(p, c)).length
    return out
  }, [CATS, projects])

  const visible = useMemo(() => projects.filter(p => matches(p, filter)), [projects, filter])

  /* Filtering: the leavers fall away first, then the survivors glide to their
     new places (Flip, transforms only) while the newcomers rise in. */
  const changeFilter = cat => {
    if (cat === filter || busy.current) return
    const root = resultsRef.current
    if (reducedMotion() || !root) { setFilter(cat); return }
    const keep = new Set(projects.filter(p => matches(p, cat)).map(p => p.id))
    const items = [...root.querySelectorAll('[data-flip-id]')]
    const leaving = items.filter(el => !keep.has(el.dataset.flipId))
    busy.current = true
    const commit = () => {
      flipState.current = Flip.getState(root.querySelectorAll('[data-flip-id]'))
      setFilter(cat)
    }
    if (leaving.length) {
      gsap.to(leaving, { opacity: 0, scale: 0.96, duration: 0.3, stagger: 0.02, ease: 'power2.in', onComplete: commit })
    } else commit()
  }

  useLayoutEffect(() => {
    const state = flipState.current
    const root = resultsRef.current
    if (!state || !root) { busy.current = false; return }
    flipState.current = null
    Flip.from(state, {
      targets: root.querySelectorAll('[data-flip-id]'),
      duration: 0.9,
      ease: 'expo.inOut',
      scale: true,
      stagger: 0.02,
      onEnter: els => gsap.fromTo(els, { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.06, delay: 0.2, ease: 'expo.out' }),
      onComplete: () => { busy.current = false; ScrollTrigger.refresh() },
    })
  }, [filter])

  // View switch: the current view fades down, the other rises in its place.
  const changeView = v => {
    if (v === view || busy.current) return
    try { localStorage.setItem(VIEW_KEY, v) } catch { /* private mode */ }
    const root = resultsRef.current
    if (reducedMotion() || !root) { setView(v); return }
    busy.current = true
    gsap.to(root, { opacity: 0, y: 16, duration: 0.25, ease: 'power2.in', onComplete: () => setView(v) })
  }

  const firstView = useRef(true)
  useLayoutEffect(() => {
    if (firstView.current) { firstView.current = false; return }
    const root = resultsRef.current
    if (!root || reducedMotion()) { busy.current = false; return }
    gsap.fromTo(root, { opacity: 0, y: 24 }, {
      opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', clearProps: 'transform,opacity',
      onComplete: () => { busy.current = false; ScrollTrigger.refresh() },
    })
  }, [view])

  const open = useCallback((project, origin) => setActive({ project, origin }), [])

  return (
    <>
      <header className={`container ${styles.head}`}>
        <Reveal variant="rise-sm" className={styles.headTop}>
          <span className="eyebrow">{t.eyebrow}</span>
          {!loading && (
            <span className="badge">{projects.length} {projects.length === 1 ? 'project' : 'projects'}</span>
          )}
        </Reveal>
        <TextReveal as="h1" by="words" trigger="mount" className={styles.title}>
          {t.heading1} {t.heading2}<span className="dot">.</span>
        </TextReveal>
        <Reveal as="p" variant="rise-sm" index={2} className={styles.sub}>{t.sub}</Reveal>
      </header>

      <div className={`container ${styles.toolbar}`}>
        <Reveal variant="rise-sm" index={3} className={styles.filters} role="group" aria-label="Filter by category">
          {CATS.map(cat => (
            <button
              key={cat}
              type="button"
              className="chip"
              onClick={() => changeFilter(cat)}
              aria-pressed={filter === cat}
            >
              {cat}
              {!loading && <span className="chip-count">{counts[cat] ?? 0}</span>}
            </button>
          ))}
        </Reveal>

        <div className={styles.toolbarEnd}>
          <p className="visually-hidden" aria-live="polite">
            {loading ? '' : `${visible.length} ${visible.length === 1 ? 'project' : 'projects'} shown`}
          </p>
          <div className={styles.views} role="group" aria-label="Layout" data-view={view}>
            <span className={styles.viewThumb} aria-hidden="true" />
            <button type="button" className={styles.viewBtn} aria-pressed={view === 'grid'} onClick={() => changeView('grid')}>
              <GridIcon /> Grid
            </button>
            <button type="button" className={styles.viewBtn} aria-pressed={view === 'index'} onClick={() => changeView('index')}>
              <ListIcon /> List
            </button>
          </div>
        </div>
      </div>

      <section className={`container ${styles.results}`}>
        <div ref={resultsRef}>
          {loading ? (
            <div className={styles.grid}>
              {[0, 1, 2].map(i => <CardSkeleton key={i} />)}
            </div>
          ) : visible.length === 0 ? (
            <div className={`card ${styles.empty}`}>
              <p>{t.emptyText}</p>
            </div>
          ) : view === 'grid' ? (
            <div className={styles.grid}>
              {visible.map((p, i) => <ProjectCard key={p.id} project={p} index={i} onOpen={open} />)}
            </div>
          ) : (
            <ProjectList items={visible} onOpen={open} />
          )}
        </div>
      </section>

      {active && (
        <ProjectLightbox
          project={active.project}
          origin={active.origin}
          onClose={() => setActive(null)}
        />
      )}
    </>
  )
}
