import { useEffect, useMemo, useState } from 'react'
import { subscribeProjects } from '../../firebase'
import {
  Reveal, ProjectBleed, ProjectBleedSkeleton, ProjectLightbox,
} from '../../components'
import { useContent } from '../../context/ContentContext'
import styles from './Work.module.css'

export default function Work() {
  const { copy } = useContent()
  const t = copy('work')

  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('All')
  const [active,   setActive]   = useState(null)

  // Live, so reordering, hiding or editing a project in the admin panel is
  // reflected here immediately rather than on the visitor's next reload.
  // Hidden projects are filtered out inside subscribeProjects.
  useEffect(() => {
    const unsubscribe = subscribeProjects(
      items => { setProjects(items); setLoading(false) },
      err   => { console.error('[Work] projects failed:', err); setLoading(false) },
    )
    return unsubscribe
  }, [])

  /*
   * The configured list sets the order and the preferred spelling; anything a
   * project actually uses is appended after it. Without that second half a
   * category invented in the admin panel would be invisible here until the
   * site-copy field was edited too, and the projects filed under it would be
   * reachable only through "All".
   *
   * Matched case-insensitively — the filter compares that way as well — so a
   * configured "Urban" and a stored "urban" stay one chip.
   */
  const CATS = useMemo(() => {
    const seen = new Map()
    const add = c => {
      const v = (c ?? '').trim()
      if (v && !seen.has(v.toLowerCase())) seen.set(v.toLowerCase(), v)
    }
    for (const c of (t.categories ?? '').split(',')) add(c)
    // Sentence case, because stored categories are lowercase by convention
    // while the configured ones are written for display.
    for (const p of projects) {
      const v = (p.category ?? '').trim()
      if (v) add(v.charAt(0).toUpperCase() + v.slice(1))
    }
    return ['All', ...seen.values()]
  }, [t.categories, projects])

  const visible = useMemo(() => (
    filter === 'All'
      ? projects
      : projects.filter(p => p.category?.toLowerCase() === filter.toLowerCase())
  ), [projects, filter])

  /* The year range across everything published, not across the current
     filter — it is a fact about the body of work, so it should not change as
     the reader filters. Guarded because `Math.min()` of an empty list is
     Infinity, which would render as "Infinity—-Infinity" on a fresh install. */
  const span = useMemo(() => {
    const years = projects.map(p => Number(p.year)).filter(Number.isFinite)
    if (years.length === 0) return null
    const lo = Math.min(...years)
    const hi = Math.max(...years)
    return lo === hi ? String(lo) : `${lo}—${hi}`
  }, [projects])

  const count = String(visible.length).padStart(2, '0')

  return (
    <>
      {/* ════ HEADER ════════════════════════════════════════════════════════
          No centred hero. The title sits on the gutter and the metadata sits
          against the opposite edge, with a rule closing the block. */}
      <header className={`tone-accent-soft ${styles.head}`}>
        <div className="grid12">
          <Reveal className={styles.headMain} variant="rise">
            <p className={styles.eyebrow}>{t.eyebrow}</p>
            <h1 className={styles.title}>
              <em>{t.heading1}</em>
              <span className={styles.titleLast}>
                {t.heading2}<span className="dot">.</span>
              </span>
            </h1>
          </Reveal>

          <Reveal className={styles.headMeta} variant="rise-sm" index={1}>
            <p className={styles.sub}>{t.sub}</p>
            {span && (
              <dl className={styles.headStats}>
                <div className={styles.headStat}>
                  <dt className={styles.statKey}>Projects</dt>
                  <dd className={styles.statVal}>
                    {String(projects.length).padStart(2, '0')}
                  </dd>
                </div>
                <div className={styles.headStat}>
                  <dt className={styles.statKey}>Span</dt>
                  <dd className={styles.statVal}>{span}</dd>
                </div>
              </dl>
            )}
          </Reveal>
        </div>
      </header>

      {/* ════ FILTER ════════════════════════════════════════════════════════
          Sticky under the nav. A ruled strip of inline filters on the left and
          the live count on the right — no pills, no cards. */}
      <div className={styles.filterBar}>
        <div className={`grid12 ${styles.filterInner}`}>
          <div className={styles.filters} role="group" aria-label="Filter by category">
            {CATS.map(cat => (
              <button
                key={cat}
                type="button"
                className={`${styles.filterBtn} ${filter === cat ? styles.filterOn : ''}`}
                onClick={() => setFilter(cat)}
                aria-pressed={filter === cat}
              >
                {cat}
              </button>
            ))}
          </div>

          <p className={styles.count} aria-live="polite">
            {loading ? '—' : count}
            <span className={styles.countUnit}>
              {visible.length === 1 ? 'project' : 'projects'}
            </span>
          </p>
        </div>
      </div>

      {/* ════ ROWS ══════════════════════════════════════════════════════════ */}
      <section className={`tone-base ${styles.list}`}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <ProjectBleedSkeleton key={i} index={i} />
          ))
        ) : visible.length === 0 ? (
          <div className="grid12">
            <p className={styles.empty}>{t.emptyText}</p>
          </div>
        ) : (
          /* Keyed on the filter so the reveal animation replays when the list
             changes. Without the key React reuses the same DOM nodes, which
             are already marked revealed, and the new set appears instantly
             while the old set fades — reading as a glitch rather than a
             transition. */
          <div key={filter}>
            {visible.map((p, i) => (
              <ProjectBleed
                key={p.id}
                project={p}
                index={i}
                onOpen={setActive}
              />
            ))}
          </div>
        )}
      </section>

      {active && <ProjectLightbox project={active} onClose={() => setActive(null)} />}
    </>
  )
}
