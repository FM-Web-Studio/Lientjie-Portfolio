import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'

const ThemeContext = createContext(null)

const STORAGE_KEY = 'lm-theme'

/* Kept in sync with --t-theme in Theme.css. Read from the custom property at
   runtime rather than hardcoded, so changing the duration in one place changes
   both the CSS transition and how long the transition class stays applied. */
function themeDuration() {
  if (typeof window === 'undefined') return 420
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--t-theme')
    .trim()
  const ms = raw.endsWith('ms') ? parseFloat(raw)
    : raw.endsWith('s') ? parseFloat(raw) * 1000
    : NaN
  return Number.isFinite(ms) ? ms : 420
}

function getInitial() {
  if (typeof window === 'undefined') return 'dark'
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  /* Dark is the default when the OS expresses no preference. The palette is
     designed dark-first - the photography is the subject and a dark ground
     lets it carry - so falling back to light would show most first-time
     visitors the secondary treatment. */
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitial)
  const timer = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  /*
   * Cross-fade the palette instead of snapping it.
   *
   * The transition lives in a class that is added for the length of one
   * transition and then removed, rather than sitting permanently on `*`.
   * A permanent colour transition would make every hover state on the site
   * lag by the same duration, and would also fire on first paint - so the
   * whole page would fade in from the wrong palette on load.
   *
   * The class goes on BEFORE data-theme changes. Applying both in the same
   * frame is fine (the browser has not painted between them), but the order
   * matters if the paint does land in between: with the attribute first, the
   * new palette is already committed and there is nothing left to animate.
   */
  const toggle = useCallback(() => {
    const root = document.documentElement

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTheme(t => (t === 'dark' ? 'light' : 'dark'))
      return
    }

    root.classList.add('theme-transition')
    setTheme(t => (t === 'dark' ? 'light' : 'dark'))

    /* A rapid double-toggle would otherwise let the first timeout strip the
       class while the second transition is still running. */
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      root.classList.remove('theme-transition')
      timer.current = null
    }, themeDuration())
  }, [])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
