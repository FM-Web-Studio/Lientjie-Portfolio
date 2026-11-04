// The title, description and link preview for every page.
// vite.config.js writes one HTML file per page from this list, so WhatsApp, LinkedIn,
// Facebook and search engines see the right preview without running the app.
// usePageMeta keeps the same title and canonical link after in-app navigation.

// The address search engines should credit. The same pages are also served on
// lientjie-portfolio.firebaseapp.com, and the canonical link keeps them from counting twice.
const SITE_URL = 'https://lientjie-portfolio.web.app'
export const SITE_NAME = 'Lientjie Meiring'
const HOME_TITLE = `${SITE_NAME} · Architecture`

// Hosting caches images, so a changed preview image needs a NEW file name.
export const SHARE_IMAGE = '/og/share.jpg'
export const SHARE_ALT = 'Lientjie Meiring\'s monogram beside her name, architecture student and designer at the University of Johannesburg'

const titleFor = title => (title ? `${title} · ${SITE_NAME}` : HOME_TITLE)

export const PAGE_META = [
  {
    path: '/',
    file: 'index.html',
    title: HOME_TITLE,
    description: 'Lientjie Meiring, architecture student and designer at the University of Johannesburg. Selected projects, interests and contact details.',
  },
  {
    path: '/work',
    file: 'work.html',
    title: titleFor('Work'),
    description: 'Architecture projects by Lientjie Meiring, spanning academic studios, structural studies and urban installations.',
  },
  {
    path: '/interests',
    file: 'interests.html',
    title: titleFor('Interests'),
    description: 'A few of the things Lientjie Meiring loves outside the studio, in pictures.',
  },
  {
    path: '/about',
    file: 'about.html',
    title: titleFor('About'),
    description: 'About Lientjie Meiring: education, experience, skills and achievements.',
  },
  {
    path: '/contact',
    file: 'contact.html',
    title: titleFor('Contact'),
    description: 'Get in touch with Lientjie Meiring about studio opportunities, collaborations or general enquiries.',
  },
  {
    path: '/privacy',
    file: 'privacy.html',
    title: titleFor('Privacy policy'),
    description: 'What this site collects, why, how long it is kept, and your rights under POPIA and the GDPR.',
  },
  {
    path: '/terms',
    file: 'terms.html',
    title: titleFor('Terms of use'),
    description: 'The terms for using this site: ownership of the work, acceptable use, liability and governing law.',
  },
]

// Pages that must never be indexed. They still get their own file so the noindex is in the HTML.
export const PRIVATE_META = [
  { path: '/admin', file: 'admin.html', title: titleFor('Admin'), noindex: true },
]

export const NOT_FOUND_META = { file: '404.html', title: titleFor('Page not found'), noindex: true }

export const absoluteUrl = path => new URL(path, SITE_URL).href

export const PERSON_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: SITE_NAME,
  url: SITE_URL,
  image: absoluteUrl('/logo.v2.png'),
  jobTitle: 'Architecture Student',
  affiliation: { '@type': 'CollegeOrUniversity', name: 'University of Johannesburg' },
  address: { '@type': 'PostalAddress', addressCountry: 'ZA' },
}
