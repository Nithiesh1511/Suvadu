import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SPECIAL_COLLECTIONS, type Product } from '@/data/products'
import { useCatalog } from '@/context/CatalogContext'
import ProductCard from '@/components/ProductCard'
import PageHeader from '@/components/PageHeader'
import { ProductGridSkeleton } from '@/components/Skeleton'
import { ChevronDown } from '@/components/Icons'
import { useSeo } from '@/lib/seo'
import CatalogError from '@/components/CatalogError'
import NotFound from './NotFound'

type SortKey = 'newest' | 'price-asc' | 'price-desc'

export default function CollectionDetail({ special }: { special?: boolean }) {
  const { slug = '' } = useParams()
  const { collections, getProductsByCollection, loading, error: catalogError } = useCatalog()
  const [sort, setSort] = useState<SortKey>('newest')

  const meta = special
    ? SPECIAL_COLLECTIONS.find((c) => c.slug === slug)
    : collections.find((c) => c.slug === slug)

  // Special collections are ordinary collections with their own landing page —
  // they list the products actually filed under them. Padding the list with
  // `catalog.slice(0, 4)` used to put Daily Ruled Notebook on the matching-sets
  // page, and a hardcoded stand-in product that duplicated a real row and
  // linked to a slug with no page behind it.
  const products = useMemo<Product[]>(() => {
    const sorted = [...getProductsByCollection(slug)]
    switch (sort) {
      case 'price-asc': sorted.sort((a, b) => a.prices.A5 - b.prices.A5); break
      case 'price-desc': sorted.sort((a, b) => b.prices.A5 - a.prices.A5); break
      default: sorted.sort((a, b) => (Number(b.isNew) - Number(a.isNew)) || b.id.localeCompare(a.id))
    }
    return sorted
  }, [slug, sort, getProductsByCollection])

  // SEO meta (brief §11) — unique per collection. As on the product page, this
  // has to own the 404 title too, since <NotFound />'s own effect runs first.
  const metaDesc = meta ? ('details' in meta ? meta.details : meta.description) : undefined
  useSeo(meta?.displayName ?? (loading ? 'Collection' : 'Page not found'), metaDesc)

  if (loading && !meta) {
    return (
      <div>
        <PageHeader title="Loading…" crumbs={[{ label: 'Collections', to: '/collections' }, { label: '…' }]} />
        <section className="container-suvadu py-12"><ProductGridSkeleton count={8} /></section>
      </div>
    )
  }
  // A special collection's meta is static, so only a main collection can go
  // missing purely because the catalogue failed to load.
  if (!meta && !special && catalogError) return <CatalogError />
  if (!meta) return <NotFound />

  const title = meta.displayName
  const subtitle = 'details' in meta ? meta.details : meta.description

  return (
    <div>
      <PageHeader
        eyebrow={special ? 'Special Collection' : 'internalName' in meta ? meta.internalName : 'Collection'}
        title={title}
        subtitle={subtitle}
        crumbs={[
          special
            ? { label: 'Special Collections', to: '/special-collections' }
            : { label: 'Collections', to: '/collections' },
          { label: title },
        ]}
      />

      <section className="container-suvadu py-12">
        <div className="mb-8 flex items-center justify-between">
          <p className="font-body text-sm font-light text-muted-foreground">
            {loading ? 'Loading…' : `${products.length} ${products.length === 1 ? 'product' : 'products'}`}
          </p>
          <label className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="field cursor-pointer appearance-none pr-10"
              aria-label="Sort by"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="price-asc">Sort: Price Low → High</option>
              <option value="price-desc">Sort: Price High → Low</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" width={16} height={16} />
          </label>
        </div>

        {/* A special collection's title comes from static data and paints at
            once, so without this the page flashes "No products here yet" for as
            long as the catalogue takes to arrive. */}
        {loading && products.length === 0 ? (
          <ProductGridSkeleton count={4} />
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="font-display text-xl text-plum">No products here yet</p>
            <p className="mx-auto mt-2 max-w-sm font-body text-sm font-light text-muted-foreground">
              This collection is being stocked. Explore our other collections in the meantime.
            </p>
            <Link to="/collections" className="btn-secondary mt-6">Browse all collections</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      <section className="border-t border-border bg-lilac/30 py-14">
        <div className="container-suvadu text-center">
          <h2 className="font-display text-3xl text-plum">Looking for something else?</h2>
          <p className="mx-auto mt-3 max-w-md font-body text-sm font-light text-muted-foreground">
            Explore all our collections or design a notebook that’s entirely your own.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/collections" className="btn-primary">All Collections</Link>
            <Link to="/special-collections" className="btn-secondary">Personalise One</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
