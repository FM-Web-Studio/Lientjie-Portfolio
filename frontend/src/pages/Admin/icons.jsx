// Admin-only line icons, drawn on the same 24px grid and stroke as components/Icons.
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  viewBox: '0 0 24 24',
}

const icon = (paths) => function Icon({ size = 16, ...rest }) {
  return <svg width={size} height={size} {...base} {...rest}>{paths}</svg>
}

export const IconUser = icon(<><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20c1.4-3.6 4.2-5.4 7.5-5.4s6.1 1.8 7.5 5.4" /></>)
export const IconCard = icon(<><rect x="3" y="5" width="18" height="14" rx="1.5" /><circle cx="9" cy="11" r="2.2" /><path d="M5.8 16.2c.7-1.5 1.8-2.2 3.2-2.2s2.5.7 3.2 2.2M15 10h3.5M15 13.5h3.5" /></>)
export const IconType = icon(<><path d="M5 6.5V5h14v1.5M12 5v14M9.5 19h5" /></>)
export const IconCap = icon(<><path d="m2.5 9.5 9.5-4.5 9.5 4.5-9.5 4.5z" /><path d="M6.5 11.5v4.2c1.6 1.4 3.4 2.1 5.5 2.1s3.9-.7 5.5-2.1v-4.2M21.5 9.5v5" /></>)
export const IconBriefcase = icon(<><rect x="3" y="7" width="18" height="12.5" rx="1.5" /><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3 12.5h18" /></>)
export const IconAward = icon(<><circle cx="12" cy="9" r="5.5" /><path d="m8.6 13.3-1.6 7.2 5-2.6 5 2.6-1.6-7.2" /></>)
export const IconBars = icon(<><path d="M4 20h16" /><path d="M6.5 16V11M11 16V6M15.5 16v-7M20 16v-3" /></>)
export const IconPlan = icon(<><rect x="3" y="3" width="18" height="18" rx="1" /><path d="M3 11h8V3M11 15v6M15 11h6M15 11v4" /></>)
export const IconImage = icon(<><rect x="3" y="4.5" width="18" height="15" rx="1.5" /><circle cx="8.5" cy="9.5" r="1.8" /><path d="m3.5 17.5 5-5 4 4 2.5-2.5 5.5 5" /></>)
export const IconInbox = icon(<><path d="M3 13.5 5.6 5.8A1.5 1.5 0 0 1 7 4.8h10a1.5 1.5 0 0 1 1.4 1l2.6 7.7V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18z" /><path d="M3 13.5h5l1.5 2.5h5l1.5-2.5h5" /></>)
export const IconPencil = icon(<><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></>)
export const IconTrash = icon(<><path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" /></>)
export const IconEye = icon(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></>)
export const IconEyeOff = icon(<><path d="M10 5.7c.6-.1 1.3-.2 2-.2 6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.7 3.4M6.3 7.2C3.9 8.9 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1.1M3 3l18 18" /><path d="M9.9 10a2.8 2.8 0 0 0 4 4" /></>)
export const IconStar = icon(<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z" />)
export const IconUpload = icon(<><path d="M12 16V4.5M7 9.5l5-5 5 5" /><path d="M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15" /></>)
export const IconChevUp = icon(<path d="m6.5 14.5 5.5-5.5 5.5 5.5" />)
export const IconChevDown = icon(<path d="m6.5 9.5 5.5 5.5 5.5-5.5" />)
export const IconChevLeft = icon(<path d="m14.5 6.5-5.5 5.5 5.5 5.5" />)
export const IconChevRight = icon(<path d="m9.5 6.5 5.5 5.5-5.5 5.5" />)
export const IconLogout = icon(<><path d="M14.5 4.5H18A1.5 1.5 0 0 1 19.5 6v12a1.5 1.5 0 0 1-1.5 1.5h-3.5" /><path d="M10.5 16.5 6 12l4.5-4.5M6 12h9.5" /></>)
export const IconReset = icon(<><path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4" /><path d="M4.5 4.5v4h4" /></>)
export const IconMenu = icon(<path d="M4 8h16M4 16h10" />)
