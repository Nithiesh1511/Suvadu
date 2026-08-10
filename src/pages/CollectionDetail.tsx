import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  SPECIAL_COLLECTIONS,
  CUSTOMIZED_PRODUCT,
  MATCHING_SET_PRODUCT,
  type Product,
} from '@/data/products'
import { useCatalog } from '@/context/CatalogContext'
import ProductCard from '@/components/ProductCard'
import PageHeader from '@/components/PageHeader'
import { ProductGridSkeleton } from '@/components/Skeleton'
import { ChevronDown } from '@/components/Icons'
import { useSeo } from '@/lib/seo'
import NotFound from './NotFound'

type SortKey = 'newest' | 'price-asc' | 'price-desc'

export default function CollectionDetail({ special }: { special?: boolean }) {
  const { slug = '' } = useParams()
  const { collections, getProductsByCollection, products: catalog, loading } = useCatalog()
  const [sort, setSort] = useState<SortKey>('newest')

  const meta = special
    ? SPECIAL_COLLECTIONS.find((c) => c.slug === slug)
    : collections.find((c) => c.slug === slug)

  const products = useMemo<Product[]>(() => {
    let list: Product[]
    if (special) {
      // Special collections feature the customizable / set products
      if (slug === 'match-and-write') list = [MATCHING_SET_PRODUCT, ...catalog.slice(0, 4)]
      else list = [CUSTOMIZED_PRODUCT, ...catalog.slice(0, 4)]
    } else {
      list = getProductsByCollection(slug)
    }
    const sorted = [...list]
    switch (sort) {
      case 'price-asc': sorted.sort((a, b) => a.prices.A5 - b.prices.A5); break
      case 'price-desc': sorted.sort((a, b) => b.prices.A5 - a.prices.A5); break
      default: sorted.sort((a, b) => (Number(b.isNew) - Number(a.isNew)) || b.id.localeCompare(a.id))
    }
    return sorted
  }, [special, slug, sort, catalog, getProductsByCollection])

  // SEO meta (brief §11) — unique per collection.
  const metaDesc = meta ? ('details' in meta ? meta.details : meta.description) : undefined
  useSeo(meta?.displayName ?? 'Collection', metaDesc)

  if (!special && loading && !meta) {
    return (
      <div>
        <PageHeader title="Loading…" crumbs={[{ label: 'Collections', to: '/collections' }, { label: '…' }]} />
        <section className="container-suvadu py-12"><ProductGridSkeleton count={8} /></section>
      </div>
    )
  }
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
            {products.length} {products.length === 1 ? 'design' : 'designs'}
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

        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      <section className="border-t border-border bg-lilac/30 py-14">
        <div className="container-suvadu text-center">
          <h2 className="font-display text-3xl text-plum">Looking for something else?</h2>
          <p className="mx-auto mt-3 max-w-md font-body text-sm font-light text-muted-foreground">
            Explore all seven collections or design a notebook that’s entirely your own.
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
