import { Link } from 'react-router-dom'
import { useCatalog } from '@/context/CatalogContext'

// ── "We couldn't load the shop" ──────────────────────────────────────────────
// When the catalogue request fails there are no products in memory, so every
// product and collection page finds nothing and renders "Page not found" — a
// real notebook, reachable a second ago, telling the shopper it doesn't exist.
// It also can't be recovered from: nothing retries, and nothing says anything
// went wrong. This is the honest version, with a way out.

export default function CatalogError({ retrying }: { retrying?: boolean }) {
  const { refresh, loading } = useCatalog()
  const busy = retrying ?? loading

  return (
    <section className="container-suvadu py-20 text-center sm:py-24">
      <div className="card-surface mx-auto max-w-md px-6 py-12 sm:py-14">
        <h1 className="font-display text-2xl text-plum sm:text-3xl">We couldn’t load the shop</h1>
        <p className="mx-auto mt-3 max-w-sm font-body text-sm font-light leading-relaxed text-muted-foreground">
          This looks like a connection problem on our side, not a missing page.
          Your cart is safe — try again in a moment.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button onClick={() => void refresh()} disabled={busy} className="btn-primary disabled:opacity-60">
            {busy ? 'Retrying…' : 'Try again'}
          </button>
          <Link to="/" className="btn-secondary">Back to home</Link>
        </div>
      </div>
    </section>
  )
}
