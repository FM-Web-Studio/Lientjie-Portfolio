import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { getContent } from '../firebase/content'
import { GROUP_FIELDS, resolveGroup } from '../content/siteCopy'

const ContentContext = createContext(null)
const CACHE_KEY = 'lm-content'

// The last copy this browser saw, so a repeat visit renders straight away and refreshes quietly.
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

/**
 * Loads the editable site copy and contact details once and shares them with every page.
 * copy(group) returns a page's strings: code defaults overlaid with the admin's edits.
 */
export function ContentProvider({ children }) {
  const [cached] = useState(readCache)
  const [content, setContent] = useState(cached || {})
  const [loaded, setLoaded] = useState(Boolean(cached))

  const reload = useCallback(async () => {
    const data = (await getContent()) || {}
    setContent(data)
    setLoaded(true)
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch { /* private mode */ }
  }, [])

  useEffect(() => { reload() }, [reload])

  // On a very slow connection the site shows after three seconds with its default wording,
  // rather than waiting on the network indefinitely.
  useEffect(() => {
    if (loaded) return undefined
    const t = setTimeout(() => setLoaded(true), 3000)
    return () => clearTimeout(t)
  }, [loaded])

  const copy = useCallback(
    (group) => resolveGroup(GROUP_FIELDS[group] || [], content?.[group]),
    [content],
  )

  const value = useMemo(() => ({ content, copy, loaded, reload }), [content, copy, loaded, reload])

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
}

export function useContent() {
  const ctx = useContext(ContentContext)
  if (!ctx) throw new Error('useContent must be used within ContentProvider')
  return ctx
}
