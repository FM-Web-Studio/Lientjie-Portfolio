import { useCallback, useEffect, useRef, useState } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import styles from './ProjectLightbox.module.css'

/* PhotoSwipe's defaults, which are what readers have been trained on: a click
   or double tap goes to 2.5x the fitted size, and a wheel, trackpad or pinch
   goes on up to 4x. Both are multiples of the fit, never of the source, so
   every image in a gallery zooms by the same amount. */
const CLICK_ZOOM = 2.5
const MAX_ZOOM = 4

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
 * Zoom follows the convention every image viewer shares: click or double tap
 * to go in, wheel, trackpad or pinch for finer control, drag to pan, Escape
 * to come back out. The gesture handling is react-zoom-pan-pinch rather than
 * hand-rolled, because velocity, bounds and touch are where hand-rolled
 * viewers come apart.
 */
export default function ProjectLightbox({ project, onClose }) {
  const [idx, setIdx] = useState(0)
  const [failed, setFailed] = useState({})
  const [scale, setScale] = useState(1)

  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const zoomRef = useRef(null)
  const zoomAreaRef = useRef(null)
  const unsubRef = useRef(null)
  const touchRef = useRef(null)
  // Where the pointer went down, so a drag that ends over the image is not
  // mistaken for a click and does not toggle the zoom.
  const downRef = useRef(null)

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

  useEffect(() => () => unsubRef.current?.(), [])

  // A new image always starts fitted. Carrying a zoom across would drop the
  // reader into the corner of a picture they have not seen yet.
  useEffect(() => { zoomRef.current?.resetTransform(0) }, [idx])

  // Read from the library, not from React state: the decision is made inside
  // a pointer handler, before any re-render has happened.
  const isZoomed = () => (zoomRef.current?.state?.scale ?? 1) > 1.01
  const zoomed = scale > 1.01

  // The fitted state is exactly scale 1 at the origin, so go there explicitly
  // rather than trusting a reset to land on it.
  const toFit = () => zoomRef.current?.setTransform(0, 0, 1, 200)

  // zoomToPoint keeps the clicked point under the cursor, the same anchoring
  // a wheel zoom does.
  const zoomAt = (clientX, clientY) =>
    zoomRef.current?.zoomToPoint(CLICK_ZOOM, clientX, clientY, 200)

  const toggleAt = (x, y) => (isZoomed() ? toFit() : zoomAt(x, y))

  const onPointerDown = e => { downRef.current = { x: e.clientX, y: e.clientY } }

  const onPointerUp = e => {
    const d = downRef.current
    downRef.current = null
    // Touch is handled below. The library consumes touch events before they
    // become clicks, and a tap would otherwise never reach here.
    if (e.pointerType === 'touch') return
    // A pan is a drag, not a click. 5px of slop covers a shaky hand.
    if (!d || Math.abs(e.clientX - d.x) > 5 || Math.abs(e.clientY - d.y) > 5) return
    toggleAt(e.clientX, e.clientY)
  }

  const onTouchStart = e => {
    touchRef.current = e.touches.length === 1
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : null
  }

  const onTouchEnd = e => {
    const t = touchRef.current
    touchRef.current = null
    // Only a clean single-finger tap: a pinch or a pan is not a tap. 8px of
    // slop, because a finger is less precise than a cursor.
    if (!t || e.touches.length) return
    const point = e.changedTouches[0]
    if (!point || Math.abs(point.clientX - t.x) > 8 || Math.abs(point.clientY - t.y) > 8) return
    // A frame later, so the library's own touch-end handling has settled.
    // Called inline it lands first and is immediately overwritten.
    const { clientX, clientY } = point
    requestAnimationFrame(() => toggleAt(clientX, clientY))
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
        if (isZoomed()) { toFit(); return }
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
        <div className={styles.stage} data-zoomed={zoomed ? 'true' : undefined}>
          {showImage ? (
            /* The handlers sit here, not on the image: the library's content
               div is the pointer target, and these catch the bubbled event. */
            <div
              ref={zoomAreaRef}
              className={styles.zoomArea}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
            <TransformWrapper
              ref={zoomRef}
              initialScale={1}
              minScale={1}
              maxScale={MAX_ZOOM}
              centerOnInit
              limitToBounds
              smooth
              /* A single click already toggles, so the library's double click
                 would fire a second toggle and undo it. */
              doubleClick={{ disabled: true }}
              wheel={{ step: 0.15 }}
              pinch={{ step: 5 }}
              /* Fires for every transform, gestures and programmatic alike,
                 which is what keeps the button label honest. */
              onInit={api => {
                unsubRef.current?.()
                unsubRef.current = api.instance.onTransform(({ scale: s }) =>
                  setScale(prev => (Math.round(prev * 100) === Math.round(s * 100) ? prev : s)),
                )
              }}
            >
              <TransformComponent
                wrapperClass={styles.stageView}
                contentClass={styles.stageContent}
              >
                <img
                  key={idx}
                  src={images[idx]}
                  alt={`${project.title} - image ${idx + 1} of ${count}`}
                  className={styles.img}
                  decoding="async"
                  draggable={false}
                  onError={() => markFailed(idx)}
                />
              </TransformComponent>
            </TransformWrapper>
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
              onClick={() => (zoomed ? toFit() : zoomRef.current?.centerView(CLICK_ZOOM, 200))}
              aria-label={zoomed ? 'Fit image to screen' : 'Zoom in on image'}
            >
              {zoomed ? `${Math.round(scale * 100)}%` : 'Zoom'}
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
