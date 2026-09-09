import { useState } from 'react'
import styles from './Figure.module.css'

/**
 * An image slot with a typographic fallback.
 *
 * This exists because the layout is full-bleed. An image that is missing, or
 * whose Storage URL has expired, leaves a hole the width of the viewport and
 * several hundred pixels tall - the page does not just look unstyled, it looks
 * broken. Project imagery is admin-uploaded, so a missing `coverImage` is a
 * normal state (a project added before its renders are ready), not an edge
 * case.
 *
 * When there is no usable image the slot renders a drafting plate instead: a
 * measured rule grid with the project's index and title set on it. It occupies
 * exactly the same box, so the page composes identically either way.
 *
 * `ratio` is always applied to the outer element, so the space is reserved
 * before the image arrives and loading one causes no layout shift.
 */
export default function Figure({
  src,
  alt = '',
  ratio = '4 / 3',
  label,
  index,
  priority = false,
  className = '',
  children,
}) {
  const [failed, setFailed] = useState(false)
  const showPlate = !src || failed

  return (
    <figure
      className={`${styles.figure} ${className}`.trim()}
      style={{ aspectRatio: ratio }}
    >
      {showPlate ? (
        <div className={styles.plate} aria-hidden={alt ? undefined : 'true'}>
          <span className={styles.plateGrid} aria-hidden="true" />
          {index != null && <span className={styles.plateIndex}>{index}</span>}
          {label && <span className={styles.plateLabel}>{label}</span>}
          {/* An empty plate still needs an accessible name when it stands in
              for a meaningful image, so `alt` is surfaced as text rather than
              silently dropped with the <img>. */}
          {alt && !label && <span className={styles.plateLabel}>{alt}</span>}
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={styles.img}
          /* The hero image is the largest contentful paint on the home page,
             so it must not be lazy - deferring it delays LCP by a round trip.
             Everything below the fold is lazy and low priority. */
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'low'}
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
      {children}
    </figure>
  )
}
