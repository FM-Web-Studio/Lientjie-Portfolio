import { useRef } from 'react'
import { gsap, SplitText, useGSAP, reducedMotion, afterCurtain } from '../../lib/motion'

const STAGGER = { lines: 0.09, words: 0.04, chars: 0.022 }

/**
 * Text that rises into place through a mask, by lines, words or chars.
 * trigger="scroll" plays when it scrolls into view, "mount" plays once the page curtain opens.
 * Re-splits on resize and font load, so lines stay correct at every width.
 */
export default function TextReveal({
  as: Tag = 'div',
  by = 'lines',
  trigger = 'scroll',
  delay = 0,
  stagger,
  start = 'top 88%',
  className = '',
  children,
  ...rest
}) {
  const ref = useRef(null)

  useGSAP(() => {
    const el = ref.current
    if (!el || reducedMotion()) return undefined
    let stop = () => {}

    const split = SplitText.create(el, {
      type: by === 'chars' ? 'lines,words,chars' : by === 'words' ? 'lines,words' : 'lines',
      mask: 'lines',
      autoSplit: true,
      linesClass: 'tr-line',
      onSplit(self) {
        const anim = gsap.from(self[by], {
          yPercent: 120,
          rotate: by === 'lines' ? 0 : 6,
          duration: by === 'chars' ? 1.1 : 1.35,
          stagger: stagger ?? STAGGER[by],
          delay,
          ease: 'expo.out',
          paused: trigger === 'mount',
          scrollTrigger: trigger === 'scroll' ? { trigger: el, start, once: true } : undefined,
        })
        if (trigger === 'mount') stop = afterCurtain(() => anim.play())
        return anim
      },
    })
    return () => { stop(); split.revert() }
  }, { scope: ref, dependencies: [by, trigger, delay] })

  return <Tag ref={ref} className={className} {...rest}>{children}</Tag>
}
