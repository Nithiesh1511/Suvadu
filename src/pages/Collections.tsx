
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { type Product } from '@/data/products'
import { useCatalog } from '@/context/CatalogContext'
import { supabase, type ReviewRow } from '@/lib/supabase'
import ProductCard from '@/components/ProductCard'
import PageHeader from '@/components/PageHeader'
import CatalogError from '@/components/CatalogError'
import Stars from '@/components/Stars'
import { ProductGridSkeleton } from '@/components/Skeleton'
import { ChevronDown, Close, Search } from '@/components/Icons'
import { cn } from '@/lib/utils'

type SortKey = 'newest' | 'price-asc' | 'price-desc'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest First' },
  { key: 'price-asc', label: 'Price: Low → High' },
  { key: 'price-desc', label: 'Price: High → Low' },
]

export default function Collections() {
  const { products: catalog, collections: COLLECTIONS, loading, error: catalogError } = useCatalog()
  const [params, setParams] = useSearchParams()
  const bestsellerOnly = params.get('filter') === 'bestseller'

  const [category, setCategory] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('newest')
  const [query, setQuery] = useState('')
  const [reviews, setReviews] = useState<ReviewRow[]>([])

  useEffect(() => {
    let active = true
    supabase.from('reviews').select('*').eq('status', 'approved').order('created_at', { ascending: false }).limit(6).then(({ data }) => {
      if (active) setReviews((data as ReviewRow[]) ?? [])
    })
    return () => { active = false }
  }, [])

  const products = useMemo(() => {
    let list: Product[] = [...catalog]
    if (bestsellerOnly) list = list.filter((p) => p.bestseller)
    if (category !== 'all') list = list.filter((p) => p.collectionSlug === category)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.collectionName.toLowerCase().includes(q))
    }
    switch (sort) {
      case 'price-asc':
        list.sort((a, b) => a.prices.A5 - b.prices.A5)
        break
      case 'price-desc':
        list.sort((a, b) => b.prices.A5 - a.prices.A5)
        break
      default:
        // Newest first: New-flagged products lead, then most-recently-added
        // (higher catalogue id = added later) as a stable recency proxy.
        list.sort((a, b) => (Number(b.isNew) - Number(a.isNew)) || b.id.localeCompare(a.id))
    }
    return list
  }, [catalog, bestsellerOnly, category, sort, query])

  // The whole page is driven by the catalogue — if it never arrived, say so
  // rather than rendering an empty shop that looks deliberately empty.
  if (catalogError) {
    return (
      <div>
        <PageHeader eyebrow="Shop" title="All Collections" crumbs={[{ label: 'Collections' }]} />
        <CatalogError />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow={bestsellerOnly ? 'Loved most' : 'Shop'}
        title={bestsellerOnly ? 'Best Sellers' : 'All Collections'}
        subtitle={
          bestsellerOnly
            ? 'The notebooks our customers keep coming back for.'
            : `${COLLECTIONS.length || ''} ${COLLECTIONS.length === 1 ? 'world' : 'worlds'} to write in. Filter, sort and search to find the one that’s yours.`.trim()
        }
        crumbs={[{ label: 'Collections' }]}
      />

      {/* Collection chips */}
      <section className="container-suvadu pt-12">
        {/* Bleeds into the gutter on phones so the chip row scrolls edge to edge,
            while the first chip still lines up with the page content. */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <Chip active={category === 'all'} onClick={() => setCategory('all')}>All</Chip>
          {COLLECTIONS.map((c) => (
            <Chip key={c.slug} active={category === c.slug} onClick={() => setCategory(c.slug)}>
              {c.displayName}
            </Chip>
          ))}
        </div>
      </section>

      {/* Toolbar: search + sort */}
      <section className="container-suvadu mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative flex w-full items-center sm:max-w-xs">
          <Search className="pointer-events-none absolute left-4 text-muted-foreground" width={18} height={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="field pl-11"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="absolute right-3 text-muted-foreground hover:text-royal"
            >
              <Close width={16} height={16} />
            </button>
          )}
        </label>

        <div className="flex items-center justify-between gap-3">
          <p className="shrink-0 font-body text-sm font-light text-muted-foreground">
            {products.length} {products.length === 1 ? 'product' : 'products'}
          </p>
          <label className="relative min-w-0">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="field cursor-pointer appearance-none truncate pr-10"
              aria-label="Sort by"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>Sort: {s.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" width={16} height={16} />
          </label>
        </div>
      </section>

      {bestsellerOnly && (
        <div className="container-suvadu mt-5">
          <button
            onClick={() => setParams({})}
            className="badge-soft gap-1.5 hover:bg-royal hover:text-white"
          >
            Bestsellers only <Close width={13} height={13} />
          </button>
        </div>
      )}

      {/* Grid */}
      <section className="container-suvadu py-12">
        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <EmptyState onReset={() => { setCategory('all'); setQuery(''); setParams({}) }} />
        )}
      </section>

      {/* Customer reviews */}
      {!bestsellerOnly && category === 'all' && !query && reviews.length > 0 && (
        <section className="border-t border-border bg-lilac/20 py-16">
          <div className="container-suvadu">
            <p className="eyebrow mb-3">Kind words</p>
            <h2 className="font-display text-3xl text-plum">Loved by writers across India</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((r) => (
                <figure key={r.id} className="card-surface flex flex-col p-6">
                  <Stars rating={r.rating} />
                  <blockquote className="mt-4 flex-1 font-body text-sm font-light leading-relaxed text-plum/90">“{r.text}”</blockquote>
                  <figcaption className="mt-5 border-t border-border pt-4">
                    <span className="block font-display text-base text-plum">{r.author_name}</span>
                    {r.location && <span className="block font-body text-xs text-muted-foreground">{r.location}</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full border px-4 py-2 font-body text-sm transition',
        active
          ? 'border-royal bg-royal text-white shadow-soft'
          : 'border-border bg-white text-plum/80 hover:border-royal hover:text-royal',
      )}
    >
      {children}
    </button>
  )
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="card-surface flex flex-col items-center px-6 py-20 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-lilac text-royal"><Search width={24} height={24} /></span>
      <h3 className="mt-5 font-display text-2xl text-plum">No products found</h3>
      <p className="mt-2 max-w-sm font-body text-sm font-light text-muted-foreground">
        Try a different category or search term — your next notebook is in here somewhere.
      </p>
      <button onClick={onReset} className="btn-secondary mt-6">Clear filters</button>
    </div>
  )
}
