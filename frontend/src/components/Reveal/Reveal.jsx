import { useInView } from '../../hooks'

/**
 * Reveals its children once, when they first scroll into view.
 *
 * Renders as whatever element you pass via `as` (default `div`) so it can drop
 * into a grid without adding a wrapper that breaks `grid-column` placement -
 * the extra div was the reason the previous version could not be used inside
 * the twelve-column grid without a second child element.
 *
 * `data-reveal` starts at "false" and flips to "true"; motion.css keys the
 * transition off that attribute. The resting state is the visible one, so a
 * reader whose JS never ran sees content rather than a blank page.
 *
 * @param {string}  as       Element to render.
 * @param {string}  variant  Motion class from motion.css: rise | rise-sm |
 *                           slide-in | slide-in-r | zoom | draw-x | draw-y.
 * @param {number}  index    Stagger position; drives the transition delay.
 * @param {number}  amount   Fraction of the element that must be visible.
 */
export default function Reveal({
  as: Tag = 'div',
  variant = 'rise',
  index = 0,
  amount = 0.15,
  className = '',
  style,
  children,
  ...rest
}) {
  const [ref, inView] = useInView(amount)

  return (
    <Tag
      ref={ref}
      data-reveal={inView ? 'true' : 'false'}
      className={`${variant} ${className}`.trim()}
      style={{ '--i': index, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
