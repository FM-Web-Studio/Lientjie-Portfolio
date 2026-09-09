import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import styles from './ProjectLightbox.module.css'

function Chevron({ dir }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points={dir === 'prev' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
    </svg>
  )
}

const MIN_SCALE = 1
const MAX_SCALE = 6
/* Where a double-click lands. Large enough that the gesture is worth making,
   small enough that the reader stays oriented in the frame. */
const STEP_SCALE = 2.5

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

/**
 * Full-screen project viewer.
 *
 * Chrome is kept to the edges so the photograph occupies the centre of the
 * screen uninterrupted, which is the same principle as the page layout.
 *
 * The stage zooms: wheel/trackpad, pinch, double-click, the +/- controls and
 * the keyboard all drive one `scale` + `offset` pair applied as a single
 * transform. Panning is only possible once the image overflows the stage, and
 * the offset is always clamped to that overflow, so the photograph can never
 * be dragged off into empty space.
 */
export default function ProjectLightbox({ project, onClose }) {
  const [idx, setIdx] = useState(0)
  const [failed, setFailed] = useState({})
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)

  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const stageRef = useRef(null)
  const imgRef = useRef(null)
  const viewportRef = useRef(null)

  /* Live pointers on the stage, keyed by pointerId: one is a pan, two are a
     pinch. Held in refs because the gesture maths must read the newest values
     synchronously inside the move handler, ahead of any re-render. */
  const pointers = useRef(new Map())
  const pinchRef = useRef(null)
  const panRef = useRef(null)

  const images = project.images?.length
    ? project.images
    : [project.coverImage].filter(Boolean)

  const count = images.length

  const resetView = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  /* Guarded against an empty gallery: `% 0` is NaN, which would set the index
     to NaN and blank the stage permanently. */
  const prev = useCallback(
    () => { resetView(); setIdx(i => (count ? (i - 1 + count) % count : 0)) },
    [count, resetView],
  )
  const next = useCallback(
    () => { resetView(); setIdx(i => (count ? (i + 1) % count : 0)) },
    [count, resetView],
  )

  /* How far the image may travel on each axis: half of whatever overflows the
     stage. Zero while the image fits, which is what pins it centred at 1x. */
  const bounds = useCallback((s) => {
    const view = viewportRef.current
    const img = imgRef.current
    if (!view || !img) return { x: 0, y: 0 }
    /* Measured against the viewport's content box, not the stage, so the
       bound matches the area the image is actually laid out in - gutters
       excluded. offsetWidth/Height are layout sizes and so are unaffected by
       the CSS transform we are about to change. */
    return {
      x: Math.max(0, (img.offsetWidth * s - view.clientWidth) / 2),
      y: Math.max(0, (img.offsetHeight * s - view.clientHeight) / 2),
    }
  }, [])

  const clampOffset = useCallback((o, s) => {
    const b = bounds(s)
    return { x: clamp(o.x, -b.x, b.x), y: clamp(o.y, -b.y, b.y) }
  }, [bounds])

  /*
   * Zoom about a point. `focus` is in stage coordinates measured from the
   * stage centre - which is also the transform origin - so the pixel under
   * the cursor stays under the cursor as the scale changes. The buttons and
   * the keyboard pass {0,0} and so zoom about the middle.
   */
  const zoomTo = useCallback((nextScale, focus = { x: 0, y: 0 }) => {
    setScale(prevScale => {
      const s = clamp(nextScale, MIN_SCALE, MAX_SCALE)
      const ratio = s / prevScale
      setOffset(prevOffset => clampOffset({
        x: focus.x - (focus.x - prevOffset.x) * ratio,
        y: focus.y - (focus.y - prevOffset.y) * ratio,
      }, s))
      return s
    })
  }, [clampOffset])

  /* Where a pointer sits relative to the stage centre. */
  const focusFrom = useCallback((clientX, clientY) => {
    const r = stageRef.current?.getBoundingClientRect()
    if (!r) return { x: 0, y: 0 }
    return { x: clientX - (r.left + r.width / 2), y: clientY - (r.top + r.height / 2) }
  }, [])

  /*
   * Lock the page behind the overlay.
   *
   * The class goes on <html>, not <body>: Lenis drives scrolling from the root
   * element, so `body { overflow: hidden }` alone leaves the page gliding
   * underneath the lightbox. The previous version also compensated for the
   * scrollbar by hand; that is unnecessary now, because the scrollbar is an
   * overlay scrollbar in every browser this targets and the compensation
   * itself caused a visible 10px jolt as the panel opened.
   */
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

  // A resize changes the overflow, so an offset that was legal a moment ago
  // can leave the image hanging half off the stage. Re-clamp rather than
  // reset, which would throw away the reader's position on every rotation.
  useEffect(() => {
    const onResize = () => setOffset(o => clampOffset(o, scale))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [clampOffset, scale])

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') {
        // While zoomed, Escape backs out of the zoom first: the reader almost
        // never means "close the whole thing" on that first press.
        if (scale > 1) { resetView(); return }
        onClose()
        return
      }
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomTo(scale + 0.5) }
      if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomTo(scale - 0.5) }
      if (e.key === '0') { e.preventDefault(); resetView() }

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
  }, [onClose, prev, next, zoomTo, resetView, scale])

  /*
   * Wheel zoom, bound by hand rather than through onWheel: React attaches its
   * wheel listener passively, so preventDefault there is ignored and the
   * browser page-zooms on ctrl+wheel instead of zooming the photograph.
   */
  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const onWheel = e => {
      e.preventDefault()
      // deltaMode 1 is lines and 2 is pages; normalise so a mouse wheel and a
      // trackpad land in roughly the same ballpark.
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1
      const factor = Math.exp(-e.deltaY * unit * 0.0022)
      const focus = focusFrom(e.clientX, e.clientY)
      setScale(s => {
        const nextScale = clamp(s * factor, MIN_SCALE, MAX_SCALE)
        const ratio = nextScale / s
        setOffset(o => clampOffset({
          x: focus.x - (focus.x - o.x) * ratio,
          y: focus.y - (focus.y - o.y) * ratio,
        }, nextScale))
        return nextScale
      })
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [clampOffset, focusFrom])

  /* ── Pointer gestures: drag to pan, two fingers to pinch ───────────────── */
  const onPointerDown = e => {
    if (e.button != null && e.button !== 0) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    /*
     * Capture ONLY once a gesture has actually begun.
     *
     * Capturing on every pointerdown retargets the whole sequence - the
     * closing click included - to the stage, so a press on the prev/next
     * arrows fired a click on the stage instead of on the button and the
     * arrows silently stopped working. At 1x there is nothing to pan
     * (the bounds are zero), so there is nothing to capture for either.
     */
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinchRef.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, scale }
      panRef.current = null
      setDragging(false)
      e.currentTarget.setPointerCapture?.(e.pointerId)
    } else if (scale > 1) {
      panRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
      setDragging(true)
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
  }

  const onPointerMove = e => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.current.size >= 2 && pinchRef.current) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
      zoomTo(
        pinchRef.current.scale * (dist / pinchRef.current.dist),
        focusFrom((a.x + b.x) / 2, (a.y + b.y) / 2),
      )
      return
    }

    if (panRef.current) {
      const p = panRef.current
      setOffset(clampOffset(
        { x: p.ox + (e.clientX - p.x), y: p.oy + (e.clientY - p.y) },
        scale,
      ))
    }
  }

  const endPointer = e => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinchRef.current = null
    if (pointers.current.size === 0) {
      panRef.current = null
      setDragging(false)
    }
  }

  // Double-click toggles between fit and a close look at the point clicked.
  const onDoubleClick = e => {
    if (scale > 1) resetView()
    else zoomTo(STEP_SCALE, focusFrom(e.clientX, e.clientY))
  }

  const markFailed = i => setFailed(p => ({ ...p, [i]: true }))
  const spec = [project.category, project.year].filter(Boolean).join(' · ')
  const zoomed = scale > 1
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

          <div className={styles.topActions}>
            {showImage && (
              <div className={styles.zoomBar} role="group" aria-label="Zoom">
                <button
                  type="button"
                  className={styles.zoomBtn}
                  onClick={() => zoomTo(scale - 0.5)}
                  disabled={scale <= MIN_SCALE}
                  aria-label="Zoom out"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={styles.zoomLevel}
                  onClick={resetView}
                  disabled={!zoomed}
                  title="Reset zoom"
                >
                  {Math.round(scale * 100)}%
                </button>
                <button
                  type="button"
                  className={styles.zoomBtn}
                  onClick={() => zoomTo(scale + 0.5)}
                  disabled={scale >= MAX_SCALE}
                  aria-label="Zoom in"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
            )}

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
        </div>

        {/* ── Body: stage on the left, text rail on the right ─────────── */}
        <div className={styles.body}>
        <div
          ref={stageRef}
          className={styles.stage}
          data-zoomed={zoomed ? 'true' : undefined}
          data-dragging={dragging ? 'true' : undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onDoubleClick={onDoubleClick}
        >
          {showImage ? (
            <div
              ref={viewportRef}
              className={styles.viewport}
              style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})` }}
              data-instant={dragging ? 'true' : undefined}
            >
              <img
                ref={imgRef}
                key={idx}
                src={images[idx]}
                alt={`${project.title} - image ${idx + 1} of ${count}`}
                className={styles.img}
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

          {/* The tall side hit-areas would swallow a pan, so they step aside
              once the image overflows the stage. Arrow keys and the thumbnail
              strip still move between images while zoomed. */}
          {count > 1 && !zoomed && (
            <>
              <button
                type="button"
                className={`${styles.nav} ${styles.navPrev}`}
                onClick={prev}
                /* Two quick taps on an arrow are impatience, not a request to
                   zoom - keep the gesture from reaching the stage. */
                onDoubleClick={e => e.stopPropagation()}
                aria-label="Previous image"
              >
                <Chevron dir="prev" />
              </button>
              <button
                type="button"
                className={`${styles.nav} ${styles.navNext}`}
                onClick={next}
                onDoubleClick={e => e.stopPropagation()}
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
                      onClick={() => { resetView(); setIdx(i) }}
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
