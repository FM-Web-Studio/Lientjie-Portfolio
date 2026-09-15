/**
 * Editable site copy for the Lientjie Meiring portfolio.
 *
 * Every visitor-facing heading / paragraph / label that used to be hardcoded now
 * lives here as a field with a `default` (the exact current string). Only values
 * that differ from the default are stored in Firestore (settings/portfolio_content),
 * so code stays the single source of truth for anything untouched.
 *
 * resolveGroup(fields, overrides) overlays saved overrides onto the defaults.
 */

export const BRAND_FIELDS = [
  { key: 'siteName',      label: 'Name (footer / copyright)', type: 'text',     default: 'Lientjie Meiring' },
  { key: 'footerTagline', label: 'Footer tagline',           type: 'text',     default: 'Architecture Portfolio' },
]

export const HOME_FIELDS = [
  /*
   * Optional. Leave blank and the hero renders as composed type on a ruled
   * drafting ground, which is always legible.
   *
   * This is deliberately NOT taken from the first featured project's cover.
   * The covers are presentation-sheet exports on a white background, and the
   * hero sets bone-white display type over its lower left - over one of those
   * sheets the name disappears and the sheet's own captions collide with it.
   * Pointing this at a real photograph is an explicit choice, not a default.
   */
  { key: 'heroImage',     label: 'Hero background image URL (optional - leave blank for type-only hero)', type: 'text', default: '' },
  { key: 'heroEyebrow',   label: 'Hero - eyebrow',       type: 'text',     default: 'Architecture Portfolio' },
  { key: 'heroNameFirst', label: 'Big name on home page - first name', type: 'text', default: 'Lientjie' },
  { key: 'heroNameLast',  label: 'Big name on home page - last name',  type: 'text', default: 'Meiring' },
  { key: 'heroBio',       label: 'Hero - bio',           type: 'textarea', default: 'A third-year architecture student at the University of Johannesburg, fascinated by how space shapes the way we feel, move, and belong.' },
  { key: 'heroCtaPrimary',   label: 'Hero - primary button',   type: 'text', default: 'Explore Work' },
  { key: 'heroCtaSecondary', label: 'Hero - secondary button', type: 'text', default: 'My Story' },
  { key: 'stat1Value', label: 'Stat 1 - value', type: 'text', default: '05' },
  { key: 'stat1Label', label: 'Stat 1 - label', type: 'text', default: 'Projects' },
  { key: 'stat2Value', label: 'Stat 2 - value', type: 'text', default: '3rd' },
  { key: 'stat2Label', label: 'Stat 2 - label', type: 'text', default: 'Year of Study' },
  { key: 'stat3Value', label: 'Stat 3 - value', type: 'text', default: '2027' },
  { key: 'stat3Label', label: 'Stat 3 - label', type: 'text', default: 'Expected Graduate' },

  { key: 'workEyebrow', label: 'Selected work - eyebrow', type: 'text', default: 'Selected Work' },
  { key: 'workTitle',   label: 'Selected work - title',   type: 'text', default: 'Recent Projects' },
  { key: 'workLink',    label: 'Selected work - link',    type: 'text', default: 'View All' },

  { key: 'aboutEyebrow', label: 'About teaser - eyebrow', type: 'text',     default: 'About Me' },
  { key: 'aboutHeading', label: 'About teaser - heading', type: 'text',     default: 'Designing Space, Shaping Experience' },
  { key: 'aboutBody',    label: 'About teaser - body',    type: 'textarea', default: 'My work investigates spatial composition, material honesty, and the stories that architecture can tell. I believe every building is an opportunity to serve and uplift the people who move through it.' },
  { key: 'aboutCta',     label: 'About teaser - button',  type: 'text',     default: 'More About Me' },
  { key: 'aboutNum1Label', label: 'About number 1 - label', type: 'text', default: 'Projects completed' },
  { key: 'aboutNum2Label', label: 'About number 2 - label', type: 'text', default: 'Year of study' },
  { key: 'aboutNum3Label', label: 'About number 3 - label', type: 'text', default: 'Expected graduation' },

  { key: 'processEyebrow', label: 'Process - eyebrow', type: 'text', default: 'Approach' },
  { key: 'processTitle',   label: 'Process - title',   type: 'text', default: 'How I Work' },
  { key: 'process1Title', label: 'Process 1 - title', type: 'text',     default: 'Concept' },
  { key: 'process1Body',  label: 'Process 1 - body',  type: 'textarea', default: 'Every design begins with a question. I explore ideas through sketching, reading, and listening to the site.' },
  { key: 'process2Title', label: 'Process 2 - title', type: 'text',     default: 'Space' },
  { key: 'process2Body',  label: 'Process 2 - body',  type: 'textarea', default: 'Space is the medium of architecture. I shape rooms, thresholds, and voids to create emotional experiences.' },
  { key: 'process3Title', label: 'Process 3 - title', type: 'text',     default: 'Material' },
  { key: 'process3Body',  label: 'Process 3 - body',  type: 'textarea', default: 'Honest materials carry truth. I investigate how concrete, timber, glass, and light each tell a story.' },
  { key: 'process4Title', label: 'Process 4 - title', type: 'text',     default: 'Detail' },
  { key: 'process4Body',  label: 'Process 4 - body',  type: 'textarea', default: 'The detail is where architecture becomes real. A well-crafted joint speaks of care and intention.' },


  { key: 'contactEyebrow', label: 'Contact strip - eyebrow', type: 'text',     default: 'Get In Touch' },
  { key: 'contactHeading', label: 'Contact strip - heading', type: 'textarea', default: 'Open for studio placements, collaborations & enquiries.' },
  { key: 'contactCta',     label: 'Contact strip - button',  type: 'text',     default: 'Say Hello' },

  { key: 'quote1Text', label: 'Quote 1 - text', type: 'textarea', default: 'Architecture is the learned game, correct and magnificent, of forms assembled in the light.' },
  { key: 'quote1Author', label: 'Quote 1 - author', type: 'text', default: 'Le Corbusier' },
  { key: 'quote2Text', label: 'Quote 2 - text', type: 'textarea', default: 'The mother art is architecture. Without an architecture of our own we have no soul of our own civilisation.' },
  { key: 'quote2Author', label: 'Quote 2 - author', type: 'text', default: 'Frank Lloyd Wright' },
  { key: 'quote3Text', label: 'Quote 3 - text', type: 'textarea', default: 'To create, one must first question everything.' },
  { key: 'quote3Author', label: 'Quote 3 - author', type: 'text', default: 'Eileen Gray' },
  { key: 'quote4Text', label: 'Quote 4 - text', type: 'textarea', default: 'Space has always been the spiritual dimension of architecture.' },
  { key: 'quote4Author', label: 'Quote 4 - author', type: 'text', default: 'Arthur Erickson' },
  { key: 'quote5Text', label: 'Quote 5 - text', type: 'textarea', default: 'Every great architect is - necessarily - a great poet.' },
  { key: 'quote5Author', label: 'Quote 5 - author', type: 'text', default: 'Frank Lloyd Wright' },
]

export const WORK_FIELDS = [
  { key: 'eyebrow',    label: 'Hero - eyebrow',      type: 'text',     default: 'Portfolio' },
  { key: 'heading1',   label: 'Hero - heading top',  type: 'text',     default: 'All' },
  { key: 'heading2',   label: 'Hero - heading emphasis', type: 'text', default: 'Work' },
  { key: 'sub',        label: 'Hero - sub',          type: 'textarea', default: 'Architecture projects spanning academic studios, structural studies, and urban installations.' },
  { key: 'categories', label: 'Filter categories - sets the order and spelling of the first chips. "All" is added automatically, and any other category used by a project is appended on its own.', type: 'text', default: 'Design and interdisciplinary design, Construction, Design and construction' },
  { key: 'emptyText',  label: 'Empty state text',    type: 'text',     default: 'No projects in this category yet.' },
]

export const INTERESTS_FIELDS = [
  { key: 'eyebrow',   label: 'Hero - eyebrow',     type: 'text',     default: 'Beyond Architecture' },
  { key: 'heading1',  label: 'Hero - heading top', type: 'text',     default: 'My' },
  { key: 'heading2',  label: 'Hero - heading emphasis', type: 'text', default: 'Interests' },
  { key: 'sub',       label: 'Hero - sub',         type: 'textarea', default: 'A few of the things I love outside the studio, in pictures.' },
]

export const ABOUT_FIELDS = [
  { key: 'eyebrow',          label: 'Hero - eyebrow',    type: 'text', default: 'About' },
  { key: 'fallbackName',     label: 'Fallback name',     type: 'text', default: 'Lientjie Meiring' },
  { key: 'fallbackTitle',    label: 'Fallback title',    type: 'text', default: 'Architecture Student' },
  { key: 'sectionProfile',   label: 'Section - Profile',    type: 'text', default: 'Profile' },
  { key: 'sectionEducation', label: 'Section - Education',  type: 'text', default: 'Education' },
  { key: 'sectionExperience',label: 'Section - Experience', type: 'text', default: 'Experience' },
  { key: 'sectionAchievements', label: 'Section - Achievements', type: 'text', default: 'Achievements' },
  { key: 'sectionSkills',    label: 'Section - Skills',     type: 'text', default: 'Skills' },
]

export const CONTACT_PAGE_FIELDS = [
  { key: 'eyebrow',      label: 'Hero - eyebrow',   type: 'text',     default: 'Contact' },
  { key: 'heading',      label: 'Hero - heading',   type: 'text',     default: 'Say Hello.' },
  { key: 'sub',          label: 'Hero - sub',       type: 'textarea', default: "Available for studio opportunities, collaborations, and general enquiries. I'd love to hear from you." },
  { key: 'detailsTitle', label: 'Details heading',  type: 'text',     default: 'Contact Details' },
  { key: 'submitLabel',  label: 'Submit button',    type: 'text',     default: 'Send Message' },
  { key: 'successTitle', label: 'Success - title',  type: 'text',     default: 'Message received.' },
  { key: 'successBody',  label: 'Success - body',   type: 'textarea', default: "Thank you for reaching out - I'll be in touch within 24 hours." },
]

// Contact details - the single source of truth (Contact page, About page, footer).
export const CONTACT_INFO_FIELDS = [
  { key: 'email',          label: 'Email',            type: 'text', default: 'meiringlientjie0214@gmail.com' },
  { key: 'phone',          label: 'Phone',            type: 'text', default: '+27 74 695 4980' },
  { key: 'location',       label: 'Location',         type: 'text', default: 'Roodepoort, Gauteng' },
  { key: 'instagram',      label: 'Instagram URL',    type: 'text', default: 'https://www.instagram.com/live_love_lien' },
  { key: 'instagramLabel', label: 'Instagram handle', type: 'text', default: '@live_love_lien' },
  { key: 'linkedin',       label: 'LinkedIn URL',     type: 'text', default: '' },
  { key: 'facebook',       label: 'Facebook URL',     type: 'text', default: '' },
  { key: 'responseTime',   label: 'Response time',    type: 'text', default: 'Within 24 hours' },
]

export const COPY_SCHEMA = [
  { key: 'brand',       label: 'Brand & Footer', fields: BRAND_FIELDS },
  { key: 'home',        label: 'Home',           fields: HOME_FIELDS },
  { key: 'work',        label: 'Work',           fields: WORK_FIELDS },
  { key: 'interests',   label: 'Interests',      fields: INTERESTS_FIELDS },
  { key: 'about',       label: 'About',          fields: ABOUT_FIELDS },
  { key: 'contactPage', label: 'Contact page',   fields: CONTACT_PAGE_FIELDS },
]

export const GROUP_FIELDS = {
  brand:       BRAND_FIELDS,
  home:        HOME_FIELDS,
  work:        WORK_FIELDS,
  interests:   INTERESTS_FIELDS,
  about:       ABOUT_FIELDS,
  contactPage: CONTACT_PAGE_FIELDS,
  contact:     CONTACT_INFO_FIELDS,
}

/** Overlay saved overrides onto the in-code defaults; blanks fall back to default. */
export const resolveGroup = (fields = [], overrides = {}) => {
  const out = {}
  for (const f of fields) {
    const ov = overrides?.[f.key]
    out[f.key] = (typeof ov === 'string' && ov.trim() !== '') ? ov : f.default
  }
  return out
}
