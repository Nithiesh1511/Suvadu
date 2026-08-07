import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import BackgroundFX from './BackgroundFX'
import { ROUTE_META, applyMeta } from '@/lib/seo'

export default function Layout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    // Apply per-route SEO meta for static pages; dynamic detail pages set
    // their own via useSeo() and are intentionally absent from ROUTE_META.
    const meta = ROUTE_META[pathname]
    if (meta) applyMeta(meta.title, meta.description)
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <BackgroundFX />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
