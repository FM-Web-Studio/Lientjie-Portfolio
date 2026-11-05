const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  viewBox: '0 0 24 24',
}

const icon = (paths) => function Icon({ size = 14, ...rest }) {
  return <svg width={size} height={size} {...base} {...rest}>{paths}</svg>
}

export const ArrowRight = icon(<><path d="M4 12h16" /><path d="m13 5 7 7-7 7" /></>)
export const ArrowUpRight = icon(<><path d="M7 17 17 7" /><path d="M8 7h9v9" /></>)
export const ArrowDown = icon(<><path d="M12 4v16" /><path d="m5 13 7 7 7-7" /></>)
export const ArrowUp = icon(<><path d="M12 20V4" /><path d="m5 11 7-7 7 7" /></>)
export const ArrowLeft = icon(<><path d="M20 12H4" /><path d="m11 5-7 7 7 7" /></>)
export const Download = icon(<><path d="M12 4v11" /><path d="m7 10 5 5 5-5" /><path d="M5 20h14" /></>)
export const Close = icon(<><path d="M6 6l12 12" /><path d="M18 6 6 18" /></>)
export const Plus = icon(<><path d="M12 5v14" /><path d="M5 12h14" /></>)
export const Check = icon(<path d="m5 12.5 4.5 4.5L19 7.5" />)
export const Sun = icon(<><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7" /></>)
export const Moon = icon(<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z" />)
export const Mail = icon(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>)
export const Spinner = icon(<path d="M12 3a9 9 0 1 0 9 9" />)
