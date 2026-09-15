import { Routes, Route, Outlet } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { NavigationBar, Footer, ToastContainer, ScrollToTop } from './components'
import { ToastProvider } from './context/ToastContext'
import { ContentProvider } from './context/ContentContext'
import useMomentumScroll from './hooks/useMomentumScroll'

const Home      = lazy(() => import('./pages/Home'))
const Work      = lazy(() => import('./pages/Work'))
const Interests = lazy(() => import('./pages/Interests'))
const About     = lazy(() => import('./pages/About'))
const Contact   = lazy(() => import('./pages/Contact'))
const NotFound  = lazy(() => import('./pages/NotFound/NotFound'))
const Admin     = lazy(() => import('./pages/Admin/Admin'))

// Holds the viewport open while a route chunk arrives so the footer does not
// jump up into view and back down. Deliberately empty of content: the chunks
// are a few KB, so anything drawn here would be a flash, not a loading state.
function PageFallback() {
  return <div style={{ minHeight: '100svh' }} aria-hidden="true" />
}

// Public site chrome - nav + footer. The admin panel is standalone (no chrome),
// and momentum scrolling is only mounted here so admin keeps native scrolling.
//
// The Suspense boundary sits inside the layout, around the Outlet only. Wrapping
// the whole router instead would unmount the nav and footer on every navigation,
// blanking the screen before the next page appears.
function PublicLayout() {
  useMomentumScroll()
  return (
    <>
      <ScrollToTop />
      <NavigationBar />
      {/* tabIndex -1 so the skip link can actually move focus here. Without
          it the browser scrolls to the element but leaves focus on the link,
          and the next Tab returns the reader to the nav they just skipped. */}
      <main id="main" tabIndex={-1}>
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <ContentProvider>
        <ToastContainer />
        <Routes>
          {/* Admin - standalone, self-gating, no public chrome */}
          <Route
            path="/admin"
            element={<Suspense fallback={<PageFallback />}><Admin /></Suspense>}
          />

          <Route element={<PublicLayout />}>
            <Route path="/"          element={<Home />} />
            <Route path="/work"      element={<Work />} />
            <Route path="/interests" element={<Interests />} />
            <Route path="/about"     element={<About />} />
            <Route path="/contact"   element={<Contact />} />
            <Route path="*"        element={<NotFound />} />
          </Route>
        </Routes>
      </ContentProvider>
    </ToastProvider>
  )
}
