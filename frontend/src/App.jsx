import { Routes, Route } from 'react-router-dom'
import { Suspense, useEffect } from 'react'
import { NavigationBar, Footer, ToastContainer, Cursor, Loader, TransitionRoutes, Ambient, TiltLayer } from './components'
import { ToastProvider } from './context/ToastContext'
import { ContentProvider, useContent } from './context/ContentContext'
import { useMomentumScroll, usePageMeta } from './hooks'
import { Home, Work, Interests, About, Contact, NotFound, Admin, Privacy, Terms, preloadPages } from './pages'
import { whenSettled } from './lib/motion'

function PageFallback() {
  return <div style={{ minHeight: '100svh' }} aria-hidden="true" />
}

// The public site: loader, cursor, nav, instant page changes and footer.
// The admin is standalone and keeps native scrolling and the system cursor.
function PublicLayout() {
  useMomentumScroll()
  // Pages wait for the live site copy, so headlines never animate a default and then swap.
  const { loaded } = useContent()
  useEffect(() => {
    // Other pages are fetched once the opening has played, so preparing them never stutters it.
    return whenSettled(preloadPages, 2600)
  }, [])
  return (
    <>
      <Loader />
      <Ambient />
      <TiltLayer />
      <Cursor />
      <NavigationBar />
      {/* tabIndex -1 so the skip link can move focus here. */}
      <main id="main" tabIndex={-1}>
        {loaded ? <TransitionRoutes>
          <Route path="/"          element={<Home />} />
          <Route path="/work"      element={<Work />} />
          <Route path="/interests" element={<Interests />} />
          <Route path="/about"     element={<About />} />
          <Route path="/contact"   element={<Contact />} />
          <Route path="/privacy"   element={<Privacy />} />
          <Route path="/terms"     element={<Terms />} />
          <Route path="*"          element={<NotFound />} />
        </TransitionRoutes> : <PageFallback />}
      </main>
      <Footer />
      <div className="grain" aria-hidden="true" />
    </>
  )
}

export default function App() {
  usePageMeta()
  return (
    <ToastProvider>
      <ContentProvider>
        <ToastContainer />
        <Routes>
          <Route path="/admin" element={<Suspense fallback={<PageFallback />}><Admin /></Suspense>} />
          <Route path="*" element={<PublicLayout />} />
        </Routes>
      </ContentProvider>
    </ToastProvider>
  )
}
