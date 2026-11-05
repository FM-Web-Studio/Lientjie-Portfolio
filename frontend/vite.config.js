import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {
  SITE_NAME, SHARE_IMAGE, SHARE_ALT, PAGE_META, PRIVATE_META, NOT_FOUND_META, PERSON_SCHEMA, absoluteUrl,
} from './src/content/seo.js'

const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// The head tags a page needs for search results and link previews.
const headFor = (page) => {
  const tags = [`<title>${escape(page.title)}</title>`]
  if (page.description) tags.push(`<meta name="description" content="${escape(page.description)}" />`)
  if (page.noindex) {
    tags.push('<meta name="robots" content="noindex, nofollow" />')
    return tags.join('\n    ')
  }
  const url = absoluteUrl(page.path)
  const image = absoluteUrl(SHARE_IMAGE)
  tags.push(
    `<link rel="canonical" href="${url}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${escape(SITE_NAME)}" />`,
    `<meta property="og:title" content="${escape(page.title)}" />`,
    `<meta property="og:description" content="${escape(page.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    '<meta property="og:locale" content="en_ZA" />',
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:secure_url" content="${image}" />`,
    '<meta property="og:image:type" content="image/jpeg" />',
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${escape(SHARE_ALT)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escape(page.title)}" />`,
    `<meta name="twitter:description" content="${escape(page.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<meta name="twitter:image:alt" content="${escape(SHARE_ALT)}" />`,
  )
  if (page.path === '/') tags.push(`<script type="application/ld+json">${JSON.stringify(PERSON_SCHEMA)}</script>`)
  return tags.join('\n    ')
}

// One HTML file per page with its own head, plus the sitemap and robots.txt, all from content/seo.js.
// Link preview bots do not run JavaScript, so the preview has to be in the HTML itself.
const seoPages = () => ({
  name: 'seo-pages',
  apply: 'build',
  enforce: 'post',
  generateBundle(_, bundle) {
    const shell = bundle['index.html'].source
      .replace(/\s*<title>[\s\S]*?<\/title>/, '')
      .replace(/\s*<meta name="description"[^>]*>/, '')
    const render = (page) => shell.replace('</head>', `  ${headFor(page)}\n  </head>`)

    for (const page of [...PAGE_META, ...PRIVATE_META, NOT_FOUND_META]) {
      if (page.file === 'index.html') bundle['index.html'].source = render(page)
      else this.emitFile({ type: 'asset', fileName: page.file, source: render(page) })
    }

    const urls = PAGE_META.map((p) => `  <url><loc>${absoluteUrl(p.path)}</loc></url>`).join('\n')
    this.emitFile({
      type: 'asset',
      fileName: 'sitemap.xml',
      source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    })

    const hidden = PRIVATE_META.map((p) => `Disallow: ${p.path}`).join('\n')
    this.emitFile({
      type: 'asset',
      fileName: 'robots.txt',
      source: `User-agent: *\n${hidden}\n\nSitemap: ${absoluteUrl('/sitemap.xml')}\n`,
    })
  },
})

export default defineConfig({
  plugins: [seoPages(), react()],
  envPrefix: ['FIREBASE_', 'ADMIN_'],
  server: {
    port: 3000,
    open: false,
  },
  preview: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/storage', 'firebase/app-check', 'firebase/functions'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'motion': ['gsap', 'gsap/ScrollTrigger', 'gsap/SplitText', '@gsap/react', 'lenis'],
        },
      },
    },
  },
})
