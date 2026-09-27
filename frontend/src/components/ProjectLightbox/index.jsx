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
  const [zoomed, setZoomed] = useState(false)

  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const scrollRef = useRef(null)
  const imgRef = useRef(null)
  // Set while a drag is panning, so the pointerup does not read as a click
  // and toggle the zoom straight back off.
  const dragRef = useRef(null)

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

  // A new image always starts fitted. Carrying a zoom across would drop the
  // reader into the corner of a picture they have not seen yet.
  useEffect(() => { setZoomed(false) }, [idx])

  /*
   * Zoom is a width on the image inside a scrolling box, not a transform.
   * The browser then owns panning, momentum and the scrollbars, which is why
   * this stays smooth and needs no gesture maths.
   *
   * 1:1 pixels is the target, held between twice the fitted size so the step
   * is always worth making, and five times it so an enormous sheet does not
   * leave the reader lost in a corner.
   */
  const zoomWidth = () => {
    const img = imgRef.current
    if (!img) return 0
    const fit = img.getBoundingClientRect().width
    return Math.round(Math.min(Math.max(img.naturalWidth, fit * 2), fit * 5))
  }

  // Zoom about the point that was clicked, so that point stays under the
  // cursor rather than the reader landing in the middle of the sheet.
  const toggleZoom = e => {
    const box = scrollRef.current
    const img = imgRef.current
    if (!box || !img) return
    if (zoomed) { setZoomed(false); return }

    const r = img.getBoundingClientRect()
    const rx = e ? (e.clientX - r.left) / r.width : 0.5
    const ry = e ? (e.clientY - r.top) / r.height : 0.5
    setZoomed(true)
    requestAnimationFrame(() => {
      box.scrollLeft = rx * box.scrollWidth - box.clientWidth / 2
      box.scrollTop = ry * box.scrollHeight - box.clientHeight / 2
    })
  }

  /* Drag to pan. Touch gets this free from the scroll box, a mouse does not. */
  const onPointerDown = e => {
    if (!zoomed || e.button !== 0) return
    const box = scrollRef.current
    dragRef.current = { x: e.clientX, y: e.clientY, left: box.scrollLeft, top: box.scrollTop, moved: false }
  }

  const onPointerMove = e => {
    const d = dragRef.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true
    scrollRef.current.scrollLeft = d.left - dx
    scrollRef.current.scrollTop = d.top - dy
  }

  const onPointerUp = e => {
    const d = dragRef.current
    dragRef.current = null
    if (!d?.moved) toggleZoom(e)
  }

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
      // Zoomed in, the first Escape backs out of the zoom. Closing the whole
      // project is almost never what that press means.
      if (e.key === 'Escape') {
        if (zoomed) { setZoomed(false); return }
        onClose()
        return
      }
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
  }, [onClose, prev, next, zoomed])

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
            <div
              ref={scrollRef}
              className={styles.scroller}
              data-zoomed={zoomed ? 'true' : undefined}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={() => { dragRef.current = null }}
            >
              <img
                ref={imgRef}
                key={idx}
                src={images[idx]}
                alt={`${project.title} - image ${idx + 1} of ${count}`}
                className={styles.img}
                style={zoomed ? { width: zoomWidth() } : undefined}
                decoding="async"
                draggable={false}
                onError={() => markFailed(idx)}
              />
            </div>
          ) : (
            <div className={styles.fallback}>
              <span className={styles.fallbackMark}>{project.title.charAt(0)}</span>
              <span className={styles.fallbackText}>Image unavailable</span>
            </div>
          )}

          {showImage && (
            <button
              type="button"
              className={styles.zoomBtn}
              onClick={() => toggleZoom()}
              aria-label={zoomed ? 'Fit image to screen' : 'Zoom in on image'}
            >
              {zoomed ? 'Fit' : 'Zoom'}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="16.5" y1="16.5" x2="21" y2="21" />
                <line x1="8" y1="11" x2="14" y2="11" />
                {!zoomed && <line x1="11" y1="8" x2="11" y2="14" />}
              </svg>
            </button>
          )}

          {/* The arrows shrink to pills while zoomed so most of the sheet stays
              draggable, but they never disappear: switching image is still one
              click away. */}
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
