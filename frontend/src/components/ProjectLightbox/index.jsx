import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './ProjectLightbox.module.css'

function Chevron({ dir }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points={dir === 'prev' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
    </svg>
  )
}

/**
 * Full-screen project viewer.
 *
 * Chrome is kept to the edges so the photograph occupies the centre of the
 * screen uninterrupted, which is the same principle as the page layout.
 *
 * There is no zoom of its own: the image is served at full resolution and the
 * browser's own pinch-to-zoom does the job, which is the gesture a reader
 * already knows and which never fights the page.
 */
export default function ProjectLightbox({ project, onClose }) {
  const [idx, setIdx] = useState(0)
  const [failed, setFailed] = useState({})

  const panelRef = useRef(null)
  const closeRef = useRef(null)

  const images = project.images?.length
    ? project.images
    : [project.coverImage].filter(Boolean)

  const count = images.length

  /* Guarded against an empty gallery: `% 0` is NaN, which would set the index
     to NaN and blank the stage permanently. */
  const prev = useCallback(
    () => setIdx(i => (count ? (i - 1 + count) % count : 0)),
    [count],
  )
  const next = useCallback(
    () => setIdx(i => (count ? (i + 1) % count : 0)),
    [count],
  )

  /* The class goes on <html>, not <body>: Lenis drives scrolling from the root
     element, so `body { overflow: hidden }` alone leaves the page gliding
     underneath the lightbox. */
  useEffect(() => {
    document.documentElement.classList.add('nav-locked')
    return () => document.documentElement.classList.remove('nav-locked')
  }, [])

  // Move focus into the panel on open, and restore it on close. Without the
  // restore, dismissing the lightbox drops focus to the top of the document
  // and a keyboard reader loses their place in the project list.
  useEffect(() => {
    const previous = document.activeElement
    closeRef.current?.focus()
    return () => {
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [])

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()

      /* Focus trap. A modal that lets Tab escape into the page behind it is
         a genuine trap for a screen-reader user, who then has no way back. */
      if (e.key === 'Tab') {
        const focusables = panelRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (!focusables?.length) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, prev, next])

  const markFailed = i => setFailed(p => ({ ...p, [i]: true }))
  const spec = [project.category, project.year].filter(Boolean).join(' · ')
  const showImage = images[idx] && !failed[idx]

  return (
    <div
      className={styles.backdrop}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={project.title}
    >
      {/* data-lenis-prevent so the description can scroll on its own without
          the page gliding behind the overlay. */}
      <div
        ref={panelRef}
        className={styles.panel}
        onClick={e => e.stopPropagation()}
        data-lenis-prevent
      >
        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <div className={styles.top}>
          <p className={styles.spec}>{spec}</p>

          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close"
          >
            Close
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Body: stage on the left, text rail on the right ─────────── */}
        <div className={styles.body}>
        <div className={styles.stage}>
          {showImage ? (
            /* The image links to itself. Opened on its own the browser shows
               it as a plain image, where zoom is the device's own and works
               the same on a phone and on a desktop. */
            <a
              className={styles.imgLink}
              href={images[idx]}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open this image full size in a new tab"
            >
              <img
                key={idx}
                src={images[idx]}
                alt={`${project.title} - image ${idx + 1} of ${count}`}
                className={styles.img}
                decoding="async"
                onError={() => markFailed(idx)}
              />
              <span className={styles.imgHint} aria-hidden="true">
                Full size
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="8 4 20 4 20 16" />
                  <line x1="20" y1="4" x2="5" y2="19" />
                </svg>
              </span>
            </a>
          ) : (
            <div className={styles.fallback}>
              <span className={styles.fallbackMark}>{project.title.charAt(0)}</span>
              <span className={styles.fallbackText}>Image unavailable</span>
            </div>
          )}

          {count > 1 && (
            <>
              <button
                type="button"
                className={`${styles.nav} ${styles.navPrev}`}
                onClick={prev}
                aria-label="Previous image"
              >
                <Chevron dir="prev" />
              </button>
              <button
                type="button"
                className={`${styles.nav} ${styles.navNext}`}
                onClick={next}
                aria-label="Next image"
              >
                <Chevron dir="next" />
              </button>
            </>
          )}
        </div>

        {/* ── Side rail ───────────────────────────────────────────────
            Beside the image rather than under it, so the stage keeps the full
            height of the panel and the photograph is as large as the screen
            allows. Scrolls on its own; the stage never does. */}
        <aside className={styles.rail} data-lenis-prevent>
          <div className={styles.info}>
            <h2 className={styles.title}>{project.title}</h2>
            {(project.longDescription || project.description) && (
              <p className={styles.desc}>
                {project.longDescription || project.description}
              </p>
            )}
            {project.tags?.length > 0 && (
              <ul className={styles.tags}>
                {project.tags.map(tag => (
                  <li key={tag} className={styles.tag}>{tag}</li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.gallery}>
            {count > 1 && (
              <>
                <p className={styles.counter} aria-live="polite">
                  {String(idx + 1).padStart(2, '0')}
                  <span className={styles.counterSep}>/</span>
                  {String(count).padStart(2, '0')}
                </p>
                <div className={styles.thumbs}>
                  {images.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`${styles.thumb} ${i === idx ? styles.thumbOn : ''}`}
                      onClick={() => setIdx(i)}
                      aria-label={`View image ${i + 1}`}
                      aria-current={i === idx ? 'true' : undefined}
                    >
                      {failed[i]
                        ? <span className={styles.thumbDead} />
                        : <img src={src} alt="" loading="lazy" onError={() => markFailed(i)} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </aside>
        </div>
      </div>
    </div>
  )
}
