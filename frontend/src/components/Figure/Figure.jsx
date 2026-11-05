import { useCallback, useState } from 'react'
import styles from './Figure.module.css'

/**
 * An image slot with a soft fallback tile.
 * `ratio` sits on the outer element so the space is reserved before the image
 * arrives: a shimmer shows while it decodes, then the photo fades in over it.
 * Imagery is admin-uploaded, so a missing src is a normal state.
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
  const [loaded, setLoaded] = useState(false)
  const showTile = !src || failed
  const name = label || alt

  // A cached image can finish before React attaches onLoad, so check on mount too.
  const imgRef = useCallback(node => {
    if (node?.complete && node.naturalWidth > 0) setLoaded(true)
  }, [])

  return (
    <figure
      className={`${styles.figure} ${className}`.trim()}
      style={{ aspectRatio: ratio }}
      data-loaded={showTile || loaded ? 'true' : 'false'}
    >
      {showTile ? (
        <div className={styles.tile} aria-hidden={alt ? undefined : 'true'}>
          {index != null && <span className={styles.tileIndex}>{index}</span>}
          {name && <span className={styles.tileLabel}>{name}</span>}
        </div>
      ) : (
        <>
          <span className={styles.loading} aria-hidden="true" />
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            className={styles.img}
            // The hero is the LCP on the home page, so it must not be lazy.
            loading={priority ? 'eager' : 'lazy'}
            // Lowercase on purpose: React 18 drops the camelCase prop.
            fetchpriority={priority ? 'high' : 'low'}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        </>
      )}
      {children}
    </figure>
  )
}
