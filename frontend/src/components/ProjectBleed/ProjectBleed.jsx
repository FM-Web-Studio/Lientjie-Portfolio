import Figure from '../Figure'
import Reveal from '../Reveal'
import styles from './ProjectBleed.module.css'

function Arrow() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

/**
 * One project as a full-bleed editorial row.
 *
 * Rows alternate: even rows put the image on the left, running off the left
 * edge of the viewport, with the metadata on the type grid to the right; odd
 * rows mirror it. That alternation is the whole structure of the page, so the
 * side is derived from `index` rather than passed in - a caller that got it
 * wrong would break the rhythm silently.
 *
 * The clickable element is the title button, not the row. Making the whole row
 * a button would put the description and the metadata inside the accessible
 * name, which a screen reader then reads as one long unpunctuated string; and
 * making both the figure and the title focusable would create two tab stops
 * for one destination. The figure is clickable for pointer users and hidden
 * from the tab order.
 */
export default function ProjectBleed({ project, index, onOpen }) {
  const {
    title, description, year, category, tags, coverImage,
  } = project

  const num = String(index + 1).padStart(2, '0')
  const flipped = index % 2 === 1
  const open = () => onOpen?.(project)

  return (
    <article className={`${styles.row} ${flipped ? styles.flipped : ''}`}>
      <Reveal
        className={`${styles.media} ${flipped ? 'bleed-right' : 'bleed-left'} lift`}
        variant="fade"
        amount={0.1}
      >
        <div
          className={styles.mediaClick}
          onClick={open}
          aria-hidden="true"
        >
          <Figure
            src={coverImage}
            alt=""
            ratio="5 / 4"
            index={num}
            label={title}
          />
        </div>
      </Reveal>

      <div className={styles.meta}>
        <Reveal className={styles.metaInner} variant={flipped ? 'slide-in-r' : 'slide-in'} amount={0.3}>
          <span className={styles.num} aria-hidden="true">{num}</span>

          <h3 className={styles.title}>
            <button type="button" className={styles.titleBtn} onClick={open}>
              {title}
              <span className={styles.titleArrow} aria-hidden="true"><Arrow /></span>
            </button>
          </h3>

          <p className={styles.spec}>
            {[category, year].filter(Boolean).join(' · ')}
          </p>

          {description && <p className={styles.desc}>{description}</p>}

          {tags?.length > 0 && (
            <ul className={styles.tags}>
              {tags.slice(0, 4).map(tag => (
                <li key={tag} className={styles.tag}>{tag}</li>
              ))}
            </ul>
          )}
        </Reveal>
      </div>
    </article>
  )
}

/** Placeholder row, used while the project list is in flight. */
export function ProjectBleedSkeleton({ index = 0 }) {
  const flipped = index % 2 === 1
  return (
    <article className={`${styles.row} ${flipped ? styles.flipped : ''}`} aria-hidden="true">
      <div className={`${styles.media} ${flipped ? 'bleed-right' : 'bleed-left'}`}>
        <div className={styles.skelMedia} />
      </div>
      <div className={styles.meta}>
        <div className={styles.metaInner}>
          <span className={styles.skelLine} style={{ width: '3ch', height: '1.6rem' }} />
          <span className={styles.skelLine} style={{ width: '70%', height: '2.4rem' }} />
          <span className={styles.skelLine} style={{ width: '40%' }} />
          <span className={styles.skelLine} style={{ width: '92%' }} />
          <span className={styles.skelLine} style={{ width: '78%' }} />
        </div>
      </div>
    </article>
  )
}
