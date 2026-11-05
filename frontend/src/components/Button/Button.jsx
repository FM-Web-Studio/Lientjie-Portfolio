import { forwardRef, useRef } from 'react'
import { Link } from 'react-router-dom'
import useMagnetic from '../../hooks/useMagnetic'

// The label as two stacked copies, so it can roll up on hover. Only plain text rolls.
export function Roll({ children }) {
  if (typeof children !== 'string') return children
  return (
    <span className="btn-roll">
      <span>{children}</span>
      <span aria-hidden="true">{children}</span>
    </span>
  )
}

// Where the pointer entered, so the fill grows from that point.
function trackEntry(e) {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--x', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--y', `${e.clientY - r.top}px`)
}

function ripple(e) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const dot = document.createElement('span')
  dot.className = 'ripple'
  dot.style.left = `${e.clientX - r.left}px`
  dot.style.top = `${e.clientY - r.top}px`
  el.appendChild(dot)
  setTimeout(() => dot.remove(), 750)
}

/**
 * The site's one button. Renders a router Link (to), an anchor (href) or a button.
 * variant: 'outline' | 'accent'. size: 'sm' | 'md' | 'lg'. icon sits after the label.
 */
const Button = forwardRef(function Button(
  { to, href, variant = 'outline', size = 'md', icon, iconOnly = false, magnetic = true, block = false, className = '', cursor, children, onPointerEnter, onPointerLeave, onPointerDown, ...rest },
  forwarded,
) {
  const own = useRef(null)
  const ref = forwarded || own
  useMagnetic(magnetic ? ref : null, size === 'lg' ? 0.3 : 0.22)

  const classes = [
    'btn',
    variant === 'accent' && 'btn-accent',
    size === 'sm' && 'btn-sm',
    size === 'lg' && 'btn-lg',
    iconOnly && 'btn-icon',
    block && 'btn-block',
    className,
  ].filter(Boolean).join(' ')

  const props = {
    ref,
    className: classes,
    'data-cursor': cursor ?? 'hide',
    onPointerEnter: (e) => { trackEntry(e); onPointerEnter?.(e) },
    onPointerLeave: (e) => { trackEntry(e); onPointerLeave?.(e) },
    onPointerDown: (e) => { ripple(e); onPointerDown?.(e) },
    ...rest,
  }
  const content = <>{!iconOnly && <Roll>{children}</Roll>}{icon}</>

  if (to) return <Link to={to} {...props}>{content}</Link>
  if (href) {
    const external = /^https?:/.test(href)
    return <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...props}>{content}</a>
  }
  return <button type="button" {...props}>{content}</button>
})

export default Button
