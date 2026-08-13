import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import BackgroundFX from './BackgroundFX'
import ErrorBoundary from './ErrorBoundary'
import WhatsAppFab from './WhatsAppFab'
import { ROUTE_META, applyMeta } from '@/lib/seo'
import { initGA, trackPageview } from '@/lib/analytics'

export default function Layout() {
  const { pathname } = useLocation()
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/')
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    // Apply per-route SEO meta for static pages; dynamic detail pages set
    // their own via useSeo() and are intentionally absent from ROUTE_META.
    const meta = ROUTE_META[pathname]
    if (meta) applyMeta(meta.title, meta.description)
    // GA4 (no-op unless VITE_GA4_ID is set): init once, track SPA page views.
    initGA()
    trackPageview(pathname)
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <BackgroundFX />
      <Header />
      <main className="flex-1">
        {/* Keyed on pathname so navigating away from an errored page recovers. */}
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
      {/* Storefront only — the admin console shares this Layout, and staff have
          no use for a customer chat button bouncing over their tables. */}
      {!isAdmin && <WhatsAppFab />}
    </div>
  )
}
