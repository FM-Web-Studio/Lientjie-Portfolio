import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { subscribeInterests } from '../../firebase'
import { Reveal, Figure, ProjectLightbox, TextReveal, Button, ArrowUpRight } from '../../components'
import { useContent } from '../../context/ContentContext'
import styles from './Interests.module.css'

/* Bento spans: the first photo leads, the rest fill rows of three (two on
   phones), and the last one stretches so a row never ends in a hole. */
function spans(i, n) {
  if (n <= 2) return { c: 1, r: n === 1 ? 2 : 1, m: 2 }
  let c = 1
  let r = 1
  if (i === 0) { c = 2; r = 2 } else if (i === n - 1 && n > 3) {
    const rem = (n - 3) % 3
    c = rem === 1 ? 3 : rem === 2 ? 2 : 1
  }
  const m = i === 0 || (i === n - 1 && (n - 1) % 2 === 1) ? 2 : 1
  return { c, r, m }
}

/** One rounded photo: zooms on hover, caption rises, click opens the viewer. */
function Photo({ src, name, i, total, onOpen }) {
  const { c, r, m } = spans(i, total)
  return (
    <Reveal
      as="li"
      variant="rise-sm"
      index={i % 3}
      amount={0.1}
      className={styles.photoItem}
      style={{ '--c': c, '--r': r, '--m': m }}
    >
      <button
        type="button"
        className={styles.photo}
        onClick={e => onOpen(i, e.currentTarget.getBoundingClientRect())}
        aria-label={`${name}, photo ${i + 1} of ${total}`}
        data-cursor="view"
      >
        <span className={styles.zoom}>
          <Figure src={src} alt="" ratio="auto" label={name} className={styles.fig} />
        </span>
        <span className={styles.caption} aria-hidden="true">
          <span>{name}</span>
          <span className={styles.captionNum}>{i + 1} / {total}</span>
        </span>
      </button>
    </Reveal>
  )
}

/** One interest as a section. One with no photos yet still shows, on a soft tile. */
function Chapter({ interest, onOpen }) {
  const { name, description, coverImage } = interest
  const photos = interest.images?.length ? interest.images : [coverImage].filter(Boolean)
  const count = interest.images?.length ?? 0
  const open = (i, origin) => onOpen(interest, i, origin)
  const headingId = `interest-${interest.id}`

  return (
    <section className={styles.chapter} aria-labelledby={headingId}>
      <div className={styles.chapterHead}>
        <div>
          <Reveal variant="rise-sm">
            <span className="badge">
              {count > 0 ? `${count} photo${count === 1 ? '' : 's'}` : description ? 'Notes' : 'Coming soon'}
            </span>
          </Reveal>
          <TextReveal as="h2" id={headingId} className={styles.name}>{name}</TextReveal>
        </div>
        <div className={styles.chapterText}>
          {description && <Reveal as="p" variant="rise-sm" index={1} className={styles.desc}>{description}</Reveal>}
          <Reveal variant="rise-sm" index={2}>
            <Button size="sm" icon={<ArrowUpRight size={14} />} onClick={() => open(0)} aria-label={`Open ${name}`}>
              {count > 0 ? 'View gallery' : 'Read more'}
            </Button>
          </Reveal>
        </div>
      </div>

      {photos.length === 0 ? (
        <button type="button" className={`${styles.photo} ${styles.emptyPhoto}`} onClick={() => open(0)} aria-label={`Open ${name}`} data-cursor="open">
          <Figure src={null} ratio="21 / 9" label={name} />
        </button>
      ) : (
        <ul className={styles.bento} data-count={photos.length}>
          {photos.map((src, i) => (
            <Photo
              key={`${src}-${i}`}
              src={src}
              name={name}
              i={i}
              total={photos.length}
              onOpen={open}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function ChapterSkeleton() {
  return (
    <div className={styles.chapter} aria-hidden="true">
      <div className={styles.chapterHead}>
        <div>
          <span className={`skeleton ${styles.skelLine}`} style={{ width: 90, height: 24 }} />
          <span className={`skeleton ${styles.skelLine}`} style={{ width: '60%', height: 40, marginTop: 16 }} />
        </div>
        <div>
          <span className={`skeleton ${styles.skelLine}`} style={{ width: '90%' }} />
          <span className={`skeleton ${styles.skelLine}`} style={{ width: '70%', marginTop: 10 }} />
        </div>
      </div>
      <div className={styles.bento} data-count="3">
        {[2, 1, 1].map((c, i) => <span key={i} className={`skeleton ${styles.skelPhoto}`} style={{ '--c': c, '--r': c, '--m': i ? 1 : 2 }} />)}
      </div>
    </div>
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

  // ProjectLightbox reads only { title, images, coverImage, description }, so an
  // interest maps onto it directly.
  const lightboxItem = active && {
    title: active.interest.name,
    description: active.interest.description,
    coverImage: active.interest.coverImage,
    images: active.interest.images,
  }

  // Mirrors the nav hiding Interests when there is nothing to show: a direct
  // visit behaves as if the page does not exist rather than an empty shell.
  if (!loading && interests.length === 0) return <Navigate to="/" replace />

  const photoCount = interests.reduce((n, it) => n + (it.images?.length ?? 0), 0)

  return (
    <>
      <header className={`container ${styles.head}`}>
        <Reveal variant="rise-sm" className={styles.headTop}>
          <span className="eyebrow">{t.eyebrow}</span>
          {!loading && (
            <span className="badge">
              {interests.length} {interests.length === 1 ? 'interest' : 'interests'}, {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
            </span>
          )}
        </Reveal>
        <TextReveal as="h1" by="words" trigger="mount" className={styles.title}>
          {t.heading1} {t.heading2}<span className="dot">.</span>
        </TextReveal>
        <Reveal as="p" variant="rise-sm" index={2} className={styles.sub}>{t.sub}</Reveal>
      </header>

      <div className={`container ${styles.chapters}`}>
        {loading
          ? <ChapterSkeleton />
          : interests.map(interest => (
            <Chapter
              key={interest.id}
              interest={interest}
              onOpen={(it, startIndex, origin) => setActive({ interest: it, startIndex, origin })}
            />
          ))}
      </div>

      {lightboxItem && (
        <ProjectLightbox
          project={lightboxItem}
          startIndex={active.startIndex}
          origin={active.origin}
          onClose={() => setActive(null)}
        />
      )}
    </>
  )
}
