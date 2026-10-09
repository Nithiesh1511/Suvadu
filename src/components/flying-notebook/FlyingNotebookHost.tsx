import { lazy, Suspense, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

// three.js is the heaviest thing on the site, so the flying notebook is a separate chunk
// that is only fetched once the browser is idle - the page paints and becomes
// usable first, and the book arrives a moment later.
const FlyingNotebook = lazy(() => import('./FlyingNotebook'))

/** Pages the flying notebook lives on. Cart, checkout, account, product pages and the
 *  policy pages are where a shopper is deciding or paying; nothing floats there. */
const FLYING_NOTEBOOK_ROUTES = [
  /^\/$/,
  /^\/collections(\/|$)/,
  /^\/special-collections(\/|$)/,
  /^\/accessories\/?$/,
  /^\/about\/?$/,
  /^\/faq\/?$/,
]

export default function FlyingNotebookHost() {
  const { pathname } = useLocation()
  const active = FLYING_NOTEBOOK_ROUTES.some((r) => r.test(pathname))
  const [wanted, setWanted] = useState(false)

  useEffect(() => {
    if (!active || wanted) return
    const start = () => setWanted(true)
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(start, { timeout: 1800 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(start, 700)
    return () => window.clearTimeout(id)
  }, [active, wanted])

  if (!wanted) return null
  return (
    <Suspense fallback={null}>
      <FlyingNotebook active={active} />
    </Suspense>
  )
}
