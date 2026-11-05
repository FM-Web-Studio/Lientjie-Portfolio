import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { gsap, reducedMotion } from '../../lib/motion'
import { ArrowLeft, ArrowRight, Close } from '../Icons'
import styles from './ProjectLightbox.module.css'

/* PhotoSwipe's defaults, which readers are trained on: a click goes to 2.5x the
   fitted size, wheel or pinch up to 4x. Multiples of the fit, never the source. */
const CLICK_ZOOM = 2.5
const MAX_ZOOM = 4
const SWIPE = 50

/**
 * Full-screen project viewer. Grows from the clicked image when given its rect
 * as `origin`, else rises. Click or wheel to zoom, drag to pan, Escape out.
 * Unzoomed, a horizontal drag or swipe changes image.
 */
export default function ProjectLightbox({ project, onClose, startIndex = 0, origin }) {
  const images = project.images?.length
    ? project.images
    : [project.coverImage].filter(Boolean)
  const count = images.length

  const [idx, setIdx] = useState(() => Math.min(Math.max(0, startIndex), Math.max(0, count - 1)))
  const [failed, setFailed] = useState({})
  const [loaded, setLoaded] = useState({})
  const [scale, setScale] = useState(1)

  const rootRef = useRef(null)
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const zoomRef = useRef(null)
  const stageRef = useRef(null)
  const thumbsRef = useRef(null)
  const unsubRef = useRef(null)
  const touchRef = useRef(null)
  const downRef = useRef(null)
  const dirRef = useRef(0)
  const closingRef = useRef(false)

  // Guarded: `% 0` is NaN and would blank the stage for an empty gallery.
  const go = useCallback(step => {
    if (!count) return
    dirRef.current = step
    setIdx(i => (i + step + count) % count)
  }, [count])
  const prev = useCallback(() => go(-1), [go])
  const next = useCallback(() => go(1), [go])
  const jump = i => { dirRef.current = i > idx ? 1 : -1; setIdx(i) }

  // The rect the viewer grows from and shrinks back to, as a clip inset.
  const insetFrom = r => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    return `inset(${r.top}px ${vw - r.right}px ${vh - r.bottom}px ${r.left}px)`
  }

  const requestClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    const root = rootRef.current
    if (reducedMotion() || !root) { onClose(); return }
    const valid = origin && origin.width > 0 && origin.bottom > 0 && origin.top < window.innerHeight
    gsap.timeline({ onComplete: onClose })
      .to(root.querySelectorAll('[data-lb-in]'), { opacity: 0, y: -16, duration: 0.3, stagger: 0.02, ease: 'power2.in' })
      .to(root, {
        clipPath: valid ? insetFrom(origin) : 'inset(0% 0% 100% 0%)',
        duration: 0.75,
        ease: 'expo.inOut',
      }, '-=0.15')
  }, [onClose, origin])

  // Open: grow from the plate when we know where it was, else a rising curtain.
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || reducedMotion()) return undefined
    const valid = origin && origin.width > 0 && origin.bottom > 0 && origin.top < window.innerHeight
    // A context, so a StrictMode re-run reverts the half-played tweens first.
    const ctx = gsap.context(() => {
      gsap.timeline()
        .fromTo(root,
          { clipPath: valid ? insetFrom(origin) : 'inset(100% 0% 0% 0%)' },
          { clipPath: 'inset(0px 0px 0px 0px)', duration: valid ? 1 : 0.9, ease: 'expo.inOut', clearProps: 'clipPath' })
        .from(root.querySelectorAll('[data-lb-in]'), {
          opacity: 0, y: 28, duration: 1, stagger: 0.06, ease: 'expo.out', clearProps: 'opacity,transform',
        }, '-=0.45')
    }, root)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => unsubRef.current?.(), [])

  // A new image starts fitted and slides in from the side it came from.
  useLayoutEffect(() => {
    zoomRef.current?.resetTransform(0)
    // Queried rather than ref'd: the zoom library warns when its child carries a ref.
    const img = stageRef.current?.querySelector('img')
    const dir = dirRef.current
    if (!img || !dir || reducedMotion()) return
    gsap.fromTo(img,
      { xPercent: dir * 6, opacity: 0 },
      { xPercent: 0, opacity: 1, duration: 0.9, ease: 'expo.out', clearProps: 'transform' })
  }, [idx])

  // Keep the active thumbnail in view, scrolling only the strip, never the page.
  useEffect(() => {
    const strip = thumbsRef.current
    const el = strip?.children[idx]
    if (!strip || !el) return
    const target = el.offsetLeft - (strip.clientWidth - el.clientWidth) / 2
    strip.scrollTo({ left: Math.max(0, target), behavior: reducedMotion() ? 'auto' : 'smooth' })
  }, [idx])

  // Warm the neighbours so the next arrow press shows a decoded image.
  useEffect(() => {
    if (count < 2) return
    for (const i of [idx + 1, idx - 1]) {
      const im = new Image()
      im.decoding = 'async'
      im.src = images[(i + count) % count]
    }
  }, [idx, count, images])

  // Read from the library, not React state: decided inside a pointer handler.
  const isZoomed = () => (zoomRef.current?.state?.scale ?? 1) > 1.01
  const zoomed = scale > 1.01

  const toFit = () => zoomRef.current?.setTransform(0, 0, 1, 200)
  const zoomAt = (x, y) => zoomRef.current?.zoomToPoint(CLICK_ZOOM, x, y, 200)
  const toggleAt = (x, y) => (isZoomed() ? toFit() : zoomAt(x, y))

  const onPointerDown = e => { downRef.current = { x: e.clientX, y: e.clientY } }

  const onPointerUp = e => {
    const d = downRef.current
    downRef.current = null
    // Touch is handled below; the library swallows touches before they click.
    if (e.pointerType === 'touch' || !d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!isZoomed() && Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy)) {
      go(dx < 0 ? 1 : -1)
      return
    }
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) return
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
    if (!t || e.touches.length) return
    const point = e.changedTouches[0]
    if (!point) return
    const dx = point.clientX - t.x
    const dy = point.clientY - t.y
    if (!isZoomed() && Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy) * 1.2) {
      go(dx < 0 ? 1 : -1)
      return
    }
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) return
    // A frame later, so the library's own touch-end has settled first.
    const { clientX, clientY } = point
    requestAnimationFrame(() => toggleAt(clientX, clientY))
  }

  // On <html>, not <body>: Lenis scrolls the root element.
  useEffect(() => {
    document.documentElement.classList.add('nav-locked')
    return () => document.documentElement.classList.remove('nav-locked')
  }, [])

  // Focus in on open, back to the opener on close, so keyboard readers keep their place.
  useEffect(() => {
    const previous = document.activeElement
    closeRef.current?.focus({ preventScroll: true })
    return () => {
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true })
    }
  }, [])

  useEffect(() => {
    const onKey = e => {
      // Zoomed in, the first Escape backs out of the zoom rather than the project.
      if (e.key === 'Escape') {
        if (isZoomed()) { toFit(); return }
        requestClose()
        return
      }
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()

      if (e.key === 'Tab') {
        const focusables = panelRef.current?.querySelectorAll(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (!focusables?.length) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (!panelRef.current.contains(document.activeElement)) {
          e.preventDefault()
          first.focus()
        } else if (e.shiftKey && document.activeElement === first) {
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
  }, [requestClose, prev, next])

  const markFailed = i => setFailed(p => ({ ...p, [i]: true }))
  const showImage = images[idx] && !failed[idx]
  const desc = project.longDescription || project.description

  const badges = [
    project.category,
    project.year,
    count > 1 ? `${count} images` : null,
  ].filter(Boolean).map(String)

  return createPortal(
    <div
      ref={rootRef}
      className={styles.root}
      role="dialog"
      aria-modal="true"
      aria-label={project.title}
    >
      <div ref={panelRef} className={styles.panel}>
        <header className={styles.top}>
          <p className={styles.crumb} data-lb-in>{project.title}</p>

          {count > 1 && (
            <p className={styles.counter} aria-live="polite" data-lb-in>
              <span className="visually-hidden">Image </span>
              <span className={styles.counterNow}>
                <span key={idx} className={styles.counterRoll}>{idx + 1}</span>
              </span>
              <span aria-hidden="true">/</span>
              <span className="visually-hidden"> of </span>
              <span className={styles.counterAll}>{count}</span>
            </p>
          )}

          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            onClick={requestClose}
            aria-label="Close project"
            data-lb-in
          >
            <span className={styles.closeText}>Close</span>
            <Close size={13} />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.stageCol}>
            <div ref={stageRef} className={styles.stage} data-zoomed={zoomed ? 'true' : undefined}>
              {showImage && !loaded[idx] && (
                <div className={styles.loading} aria-hidden="true"><span className={styles.spinner} /></div>
              )}

              {showImage ? (
                /* Handlers here, not on the image: the library's content div is
                   the pointer target and these catch the bubbled event. */
                <div
                  className={styles.zoomArea}
                  onPointerDown={onPointerDown}
                  onPointerUp={onPointerUp}
                  onTouchStart={onTouchStart}
                  onTouchEnd={onTouchEnd}
                  data-cursor={zoomed ? 'drag' : 'view'}
                  data-cursor-label={zoomed ? 'Drag' : 'Zoom'}
                >
                  <TransformWrapper
                    ref={zoomRef}
                    initialScale={1}
                    minScale={1}
                    maxScale={MAX_ZOOM}
                    centerOnInit
                    limitToBounds
                    smooth
                    // A single click already toggles; a double click would undo it.
                    doubleClick={{ disabled: true }}
                    // Fitted, a drag means "next image", so the library leaves it alone.
                    panning={{ disabled: !zoomed }}
                    wheel={{ step: 0.15 }}
                    pinch={{ step: 5 }}
                    onInit={api => {
                      unsubRef.current?.()
                      unsubRef.current = api.instance.onTransform(({ scale: s }) =>
                        setScale(p => (Math.round(p * 100) === Math.round(s * 100) ? p : s)),
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
                        onLoad={() => setLoaded(p => ({ ...p, [idx]: true }))}
                        onError={() => markFailed(idx)}
                      />
                    </TransformComponent>
                  </TransformWrapper>
                </div>
              ) : (
                <div className={styles.fallback}>
                  <span className={styles.fallbackTitle}>{project.title}</span>
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

              {/* Tall edge targets when fitted; small pills while zoomed so the
                  sheet stays draggable, but switching image is one click away. */}
              {count > 1 && (
                <>
                  <button
                    type="button"
                    className={`${styles.nav} ${styles.navPrev}`}
                    onClick={prev}
                    aria-label="Previous image"
                    data-cursor="next"
                    data-cursor-label="Prev"
                  >
                    <span className={styles.navIcon}><ArrowLeft size={16} /></span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.nav} ${styles.navNext}`}
                    onClick={next}
                    aria-label="Next image"
                    data-cursor="next"
                  >
                    <span className={styles.navIcon}><ArrowRight size={16} /></span>
                  </button>
                </>
              )}
            </div>

            {count > 1 && (
              <div className={styles.strip} data-lb-in>
                <div ref={thumbsRef} className={styles.thumbs} data-lenis-prevent>
                  {images.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`${styles.thumb} ${i === idx ? styles.thumbOn : ''}`}
                      onClick={() => jump(i)}
                      aria-label={`View image ${i + 1}`}
                      aria-current={i === idx ? 'true' : undefined}
                    >
                      {failed[i]
                        ? <span className={styles.thumbDead} />
                        : <img src={src} alt="" loading="lazy" decoding="async" onError={() => markFailed(i)} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Beside the image so the stage keeps the full height; only the prose scrolls. */}
          <aside className={styles.rail} data-lenis-prevent>
            <div className={styles.info}>
              <h2 className={styles.title} data-lb-in>{project.title}</h2>
              {badges.length > 0 && (
                <div className={styles.badges} data-lb-in>
                  {badges.map((b, i) => (
                    <span key={`${i}-${b}`} className={`${styles.badge} ${i === 0 && project.category ? styles.badgeAccent : ''}`}>{b}</span>
                  ))}
                </div>
              )}
              {desc && <p className={styles.desc} data-lb-in>{desc}</p>}
              {project.tags?.length > 0 && (
                <ul className={styles.tags} data-lb-in aria-label="Tags">
                  {project.tags.map(tag => (
                    <li key={tag} className={styles.badge}>{tag}</li>
                  ))}
                </ul>
              )}
              {count > 1 && (
                <p className={styles.hint} data-lb-in>
                  Arrow keys or swipe to browse. Click to zoom.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>,
    document.body,
  )
}
