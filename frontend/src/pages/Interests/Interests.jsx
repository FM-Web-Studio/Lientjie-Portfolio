import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { subscribeInterests } from '../../firebase'
import { Reveal, Figure, ProjectLightbox } from '../../components'
import { useContent } from '../../context/ContentContext'
import styles from './Interests.module.css'

/** Placeholder tile, shown while the interest list is in flight. */
function InterestTileSkeleton({ index = 0 }) {
  return (
    <div className={styles.tile} aria-hidden="true">
      <div className={styles.tileMedia}>
        <div className={styles.skelMedia} />
      </div>
      <div className={styles.tileFoot}>
        <span className={styles.skelLine} style={{ width: '3ch' }} />
        <span className={styles.skelLine} style={{ width: '60%', height: '1.2rem' }} />
      </div>
    </div>
  )
}

/**
 * One interest as a tile: cover image, name, and how many photos it holds.
 * An interest with zero images still renders - Figure falls back to a
 * drafting plate carrying its name, so a hobby someone hasn't photographed
 * yet is not silently dropped from the page.
 */
function InterestTile({ interest, index, onOpen }) {
  const { name, description, coverImage, images } = interest
  const count = images?.length ?? 0
  const num = String(index + 1).padStart(2, '0')

  return (
    <Reveal as="button" type="button" className={styles.tile} variant="rise-sm" index={index % 6} amount={0.15} onClick={() => onOpen(interest)}>
      <div className={styles.tileMedia}>
        <Figure src={coverImage} alt="" ratio="4 / 5" index={num} label={name} />
        <span className={styles.tileScrim} aria-hidden="true" />
      </div>
      <div className={styles.tileFoot}>
        <span className={styles.tileNum} aria-hidden="true">{num}</span>
        <span className={styles.tileName}>{name}</span>
        <span className={styles.tileCount}>
          {count > 0 ? `${count} photo${count === 1 ? '' : 's'}` : description ? 'Read more' : 'Coming soon'}
        </span>
      </div>
    </Reveal>
  )
}

export default function Interests() {
  const { copy } = useContent()
  const t = copy('interests')

  const [interests, setInterests] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null)

  useEffect(() => {
    const unsubscribe = subscribeInterests(
      items => { setInterests(items); setLoading(false) },
      err   => { console.error('[Interests] failed:', err); setLoading(false) },
    )
    return unsubscribe
  }, [])

  /* ProjectLightbox is generic over any { title, images, coverImage,
     description } shape - it never reads project-only fields like category
     or tags unless they're present, so an interest can be handed to it
     directly without a project-shaped wrapper. */
  const lightboxItem = active && {
    title: active.name,
    description: active.description,
    coverImage: active.coverImage,
    images: active.images,
  }

  // Mirrors the nav bar hiding the Interests tab when there's nothing to
  // show: a reader who reaches this URL directly (bookmark, typed link)
  // should find it behaves as if the page doesn't exist, not an empty shell.
  if (!loading && interests.length === 0) return <Navigate to="/" replace />

  return (
    <>
      {/* ════ HEADER ════════════════════════════════════════════════════════ */}
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
          </Reveal>
        </div>
      </header>

      {/* ════ GRID ══════════════════════════════════════════════════════════ */}
      <section className={`tone-base ${styles.section}`}>
        <div className="grid12">
          {loading ? (
            <div className={styles.grid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <InterestTileSkeleton key={i} index={i} />
              ))}
            </div>
          ) : (
            <div className={styles.grid}>
              {interests.map((interest, i) => (
                <InterestTile key={interest.id} interest={interest} index={i} onOpen={setActive} />
              ))}
            </div>
          )}
        </div>
      </section>

      {lightboxItem && <ProjectLightbox project={lightboxItem} onClose={() => setActive(null)} />}
    </>
  )
}
