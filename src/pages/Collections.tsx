
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { type Product } from '@/data/products'
import { useCatalog } from '@/context/CatalogContext'
import ProductCard from '@/components/ProductCard'
import PageHeader from '@/components/PageHeader'
import NotebookCover from '@/components/NotebookCover'
import { ChevronDown, Close, Search } from '@/components/Icons'
import { cn } from '@/lib/utils'

type SortKey = 'newest' | 'price-asc' | 'price-desc'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest First' },
  { key: 'price-asc', label: 'Price: Low → High' },
  { key: 'price-desc', label: 'Price: High → Low' },
]

export default function Collections() {
  const { products: catalog, collections: COLLECTIONS } = useCatalog()
  const [params, setParams] = useSearchParams()
  const bestsellerOnly = params.get('filter') === 'bestseller'

  const [category, setCategory] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('newest')
  const [query, setQuery] = useState('')

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

  return (
    <div>
      <PageHeader
        eyebrow={bestsellerOnly ? 'Loved most' : 'Shop'}
        title={bestsellerOnly ? 'Best Sellers' : 'All Collections'}
        subtitle={
          bestsellerOnly
            ? 'The notebooks our customers keep coming back for.'
            : 'Seven worlds to write in. Filter, sort and search to find the one that’s yours.'
        }
        crumbs={[{ label: 'Collections' }]}
      />

      {/* Collection chips */}
      <section className="container-suvadu pt-12">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto pb-1">
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

        <div className="flex items-center justify-between gap-4">
          <p className="font-body text-sm font-light text-muted-foreground">
            {products.length} {products.length === 1 ? 'product' : 'products'}
          </p>
          <label className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="field cursor-pointer appearance-none pr-10"
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
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <EmptyState onReset={() => { setCategory('all'); setQuery(''); setParams({}) }} />
        )}
      </section>

      {/* Browse by collection cards */}
      {!bestsellerOnly && category === 'all' && !query && (
        <section className="container-suvadu pb-20">
          <h2 className="font-display text-3xl text-plum">Browse by collection</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {COLLECTIONS.map((c) => (
              <Link
                key={c.slug}
                to={`/collections/${c.slug}`}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="w-16 shrink-0">
                  <NotebookCover colour={c.accent} pattern={c.pattern} />
                </div>
                <div>
                  <h3 className="font-display text-xl text-plum">{c.displayName}</h3>
                  <p className="font-body text-xs font-light text-muted-foreground">{c.count} designs</p>
                </div>
              </Link>
            ))}
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
