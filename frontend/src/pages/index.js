import { lazy } from 'react'

// Pages are split into their own files, then all fetched in idle time after the first
// page shows, so moving between pages never waits on a download.
const loaders = {
  Home:      () => import('./Home'),
  Work:      () => import('./Work'),
  Interests: () => import('./Interests'),
  About:     () => import('./About'),
  Contact:   () => import('./Contact'),
  NotFound:  () => import('./NotFound'),
  Legal:     () => import('./Legal'),
}

export const preloadPages = () => Object.values(loaders).forEach(load => load())

export const Home      = lazy(loaders.Home)
export const Work      = lazy(loaders.Work)
export const Interests = lazy(loaders.Interests)
export const About     = lazy(loaders.About)
export const Contact   = lazy(loaders.Contact)
export const NotFound  = lazy(loaders.NotFound)
export const Admin     = lazy(() => import('./Admin'))
export const Privacy   = lazy(() => loaders.Legal().then(m => ({ default: m.Privacy })))
export const Terms     = lazy(() => loaders.Legal().then(m => ({ default: m.Terms })))
