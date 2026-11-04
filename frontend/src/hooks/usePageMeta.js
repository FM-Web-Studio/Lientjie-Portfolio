import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { PAGE_META, PRIVATE_META, NOT_FOUND_META, absoluteUrl } from '../content/seo'

const metaFor = pathname =>
  [...PAGE_META, ...PRIVATE_META].find(p => p.path === pathname) ?? NOT_FOUND_META

const setHeadTag = (selector, create, attr, value) => {
  let tag = document.head.querySelector(selector)
  if (value == null) { tag?.remove(); return }
  if (!tag) { tag = create(); document.head.appendChild(tag) }
  tag.setAttribute(attr, value)
}

const meta = name => () => Object.assign(document.createElement('meta'), { name })

// The build gives each route its own head (see content/seo.js); this keeps the
// title, description, canonical link and noindex right after in-app navigation.
export function usePageMeta() {
  const { pathname } = useLocation()
  useEffect(() => {
    const page = metaFor(pathname.replace(/(.)\/$/, '$1'))
    document.title = page.title
    setHeadTag('meta[name="description"]', meta('description'), 'content', page.description ?? null)
    setHeadTag('meta[name="robots"]', meta('robots'), 'content', page.noindex ? 'noindex, nofollow' : null)
    setHeadTag('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), 'href', page.noindex ? null : absoluteUrl(page.path))
  }, [pathname])
}
