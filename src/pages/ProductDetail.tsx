import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  COLOURS,
  FONT_OPTIONS,
  PAGE_OPTIONS,
  DEFAULT_PAGES,
  SIZE_INFO,
  priceForPages,
  type SizeKey,
  type ColourOption,
} from '@/data/products'
import { useCatalog } from '@/context/CatalogContext'
import { useStore, type Customization } from '@/context/StoreContext'
import { useToast } from '@/components/Toast'
import NotebookCover from '@/components/NotebookCover'
import ProductImage from '@/components/ProductImage'
import ProductCard from '@/components/ProductCard'
import ProductReviews from '@/components/ProductReviews'
import PageHeader from '@/components/PageHeader'
import JsonLd from '@/components/JsonLd'
import { Heart, Share, Zoom, Plus, Minus, Check, Close, Truck, Leaf, Pen } from '@/components/Icons'
import { formatINR, cn } from '@/lib/utils'
import { useSeo } from '@/lib/seo'
import NotFound from './NotFound'

const TRUST = [
  { Icon: Truck, t: 'Pan-India delivery', d: 'Tracked via Shiprocket' },
  { Icon: Leaf, t: '100 GSM paper', d: 'Lay-flat binding' },
  { Icon: Check, t: 'Secure checkout', d: 'Razorpay protected' },
]

export default function ProductDetail() {
  const { slug = '' } = useParams()
  const { getProductBySlug, products, colours, loading } = useCatalog()
  const product = getProductBySlug(slug)
  const navigate = useNavigate()
  const { addToCart, toggleWishlist, isWished, user } = useStore()
  const { notify } = useToast()

  const isCustom = product?.type === 'customized'

  const size: SizeKey = 'A5' // A5 is the only offered size
  const [colour, setColour] = useState<ColourOption>(product?.colour ?? COLOURS[0])
  const [pages, setPages] = useState<number>(DEFAULT_PAGES)
  const [ruling, setRuling] = useState<'Ruled' | 'Unruled'>('Ruled')
  const [qty, setQty] = useState(1)
  const [thumb, setThumb] = useState(0)
  const [zoom, setZoom] = useState(false)
  // Personalise your cover: open by default for custom products, also revealed when the user picks the Custom size
  const [showPersonalise, setShowPersonalise] = useState(isCustom)

  // The product loads async from the DB, so isCustom is false on first render —
  // open the personalise panel once we know it's a customized product.
  useEffect(() => { if (isCustom) setShowPersonalise(true) }, [isCustom])

  // Customization state (only relevant for customized products)
  const [cName, setCName] = useState('')
  const [cText, setCText] = useState('')
  const [cFont, setCFont] = useState(FONT_OPTIONS[0])

  const related = useMemo(
    () => products.filter((p) => p.slug !== slug && p.collectionSlug === product?.collectionSlug).slice(0, 4),
    [slug, product, products],
  )
  const fallbackRelated = useMemo(() => products.filter((p) => p.slug !== slug).slice(0, 4), [slug, products])

  // SEO meta (brief §11) — unique title + description per product.
  useSeo(product?.name ?? 'Product', product?.description)

  if (loading && !product) {
    return (
      <div className="container-suvadu py-24 text-center font-body text-sm font-light text-muted-foreground">
        Loading…
      </div>
    )
  }
  if (!product) return <NotFound />
  const prod = product // narrowed (non-undefined) — safe to capture in closures below

  const wished = isWished(prod.id)
  const basePrice = product.prices.A5
  const onRequest = basePrice == null
  // Page count scales the price (listed price is for 160 pages).
  const unitPrice = basePrice == null ? null : priceForPages(basePrice, pages)

  const previewText = cName || cText
  const thumbs = buildThumbs(colour, product.pattern)

  // Product structured data (brief §11 — Product schema)
  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: prod.name,
    description: prod.description,
    category: prod.collectionName,
    brand: { '@type': 'Brand', name: 'SUVADU Notebooks' },
    aggregateRating: { '@type': 'AggregateRating', ratingValue: prod.rating, reviewCount: prod.reviews },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: prod.prices.A5 ?? prod.prices.A4 ?? 0,
      availability: 'https://schema.org/InStock',
      url: `https://suvadu.example.com/products/${prod.slug}`,
    },
  }

  function handleAddToCart(redirect = false) {
    if (onRequest) {
      notify('This size is priced on request — we’ll be in touch with a quote.')
      return
    }
    if (isCustom && !cName.trim() && !cText.trim()) {
      notify('Add a name or text for your personalised cover.')
      return
    }
    const customization: Customization | undefined = isCustom
      ? { name: cName.trim() || undefined, text: cText.trim() || undefined, font: cFont, colour: colour.name }
      : undefined
    addToCart({ product: prod, size, unitPrice: unitPrice as number, pages, ruling, customization, qty })
    notify(`Added ${qty} × ${prod.name} to cart`)
    if (redirect) navigate('/checkout')
  }

  function handleWish() {
    if (!user) { notify('Please sign in to save to your wishlist'); navigate('/account'); return }
    toggleWishlist(prod.id)
    notify(wished ? 'Removed from wishlist' : 'Saved to wishlist ♥')
  }

  function share() {
    const url = window.location.href
    if (navigator.share) navigator.share({ title: prod.name, url }).catch(() => {})
    else { navigator.clipboard?.writeText(url); notify('Product link copied to clipboard') }
  }

  return (
    <div>
      <JsonLd data={productLd} />
      <PageHeader
        title=""
        crumbs={[
          { label: 'Collections', to: '/collections' },
          { label: product.collectionName, to: `/collections/${product.collectionSlug}` },
          { label: product.name },
        ]}
      />

      <section className="container-suvadu -mt-4 grid gap-10 py-12 lg:grid-cols-2 lg:gap-16">
        {/* Gallery */}
        <div>
          <button
            type="button"
            onClick={() => setZoom(true)}
            className="group relative block w-full cursor-zoom-in overflow-hidden rounded-3xl border border-border shadow-card"
            aria-label="Zoom image"
          >
            <ProductImage
              image={product.image}
              alt={product.name}
              colour={colour.hex}
              pattern={product.pattern}
              label={product.collectionName}
              customText={isCustom ? previewText || undefined : undefined}
              customFont={isCustom ? cFont : undefined}
              className="!aspect-[4/5]"
            />
            <span className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-royal opacity-0 shadow-card transition group-hover:opacity-100">
              <Zoom width={18} height={18} />
            </span>
          </button>

          <div className={cn('mt-4 grid grid-cols-4 gap-3', product.image && 'hidden')}>
            {thumbs.map((t, i) => (
              <button
                key={i}
                onClick={() => { setThumb(i); setColour(t.colour) }}
                className={cn(
                  'overflow-hidden rounded-xl border-2 transition',
                  thumb === i ? 'border-royal' : 'border-transparent hover:border-royal/40',
                )}
                aria-label={`View ${t.colour.name}`}
              >
                <NotebookCover colour={t.colour.hex} pattern={t.pattern} className="!aspect-square" />
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/collections/${product.collectionSlug}`} className="eyebrow">{product.collectionName}</Link>
            {product.bestseller && <span className="badge-soft bg-royal text-white">Bestseller</span>}
            {product.isNew && <span className="badge-soft">New</span>}
          </div>

          <h1 className="mt-3 font-display text-4xl leading-tight text-plum sm:text-5xl">{product.name}</h1>

          {/* Price — updates with size */}
          <div className="mt-6 flex items-end gap-3">
            {onRequest ? (
              <span className="font-display text-3xl text-royal">Price on request</span>
            ) : (
              <span className="font-body text-3xl font-medium text-plum">{formatINR(unitPrice as number)}</span>
            )}
            <span className="pb-1 font-body text-sm font-light text-muted-foreground">incl. taxes · {size}</span>
          </div>

          <p className="mt-5 font-body text-base font-light leading-relaxed text-muted-foreground">{product.description}</p>

          {/* Size — A5 only */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h3 className="font-body text-sm font-medium uppercase tracking-wide text-plum">Size</h3>
              <span className="font-body text-xs font-light text-muted-foreground">{SIZE_INFO.A5.dims}</span>
            </div>
            <div className="mt-3">
              <span className="inline-flex min-w-[84px] items-center justify-center rounded-xl border border-royal bg-royal px-4 py-2.5 font-body text-sm text-white shadow-soft">A5</span>
            </div>
          </div>

          {/* Page-count selector */}
          <div className="mt-7">
            <div className="flex items-center justify-between">
              <h3 className="font-body text-sm font-medium uppercase tracking-wide text-plum">Pages</h3>
              <span className="font-body text-xs font-light text-muted-foreground">{pages} pages</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              {PAGE_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPages(p)}
                  className={cn(
                    'min-w-[84px] rounded-xl border px-4 py-2.5 font-body text-sm transition',
                    pages === p ? 'border-royal bg-royal text-white shadow-soft' : 'border-border bg-white text-plum hover:border-royal',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Ruled / Unruled */}
          <div className="mt-7">
            <h3 className="font-body text-sm font-medium uppercase tracking-wide text-plum">Pages style</h3>
            <div className="mt-3 flex flex-wrap gap-3">
              {(['Ruled', 'Unruled'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRuling(r)}
                  className={cn(
                    'min-w-[110px] rounded-xl border px-4 py-2.5 font-body text-sm transition',
                    ruling === r ? 'border-royal bg-royal text-white shadow-soft' : 'border-border bg-white text-plum hover:border-royal',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Customization fields — ONLY for customized products, revealed when the user picks Custom (brief §7.2) */}
          {isCustom && showPersonalise && (
            <div className="mt-8 rounded-2xl border border-royal/20 bg-lilac/40 p-5">
              <h3 className="flex items-center gap-2 font-display text-xl text-plum">
                <Pen width={18} className="text-royal" /> Personalise your cover
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block font-body text-xs font-medium uppercase tracking-wide text-plum">Name on cover</span>
                  <input value={cName} onChange={(e) => setCName(e.target.value)} maxLength={20} placeholder="e.g. Ananya" className="field" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-body text-xs font-medium uppercase tracking-wide text-plum">Font</span>
                  <select value={cFont} onChange={(e) => setCFont(e.target.value)} className="field cursor-pointer">
                    {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block font-body text-xs font-medium uppercase tracking-wide text-plum">Custom text (optional)</span>
                  <input value={cText} onChange={(e) => setCText(e.target.value)} maxLength={32} placeholder="A short line, quote or date" className="field" />
                </label>
              </div>

              {/* Cover colour — circular swatches (brief §7.2 / §5) */}
              <div className="mt-4">
                <span className="mb-2 block font-body text-xs font-medium uppercase tracking-wide text-plum">Cover colour</span>
                <div className="flex flex-wrap gap-2.5">
                  {colours.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setColour(c)}
                      aria-label={c.name}
                      aria-pressed={colour.name === c.name}
                      title={c.name}
                      className={cn(
                        'h-8 w-8 rounded-full border border-border transition',
                        colour.name === c.name ? 'ring-2 ring-royal ring-offset-2' : 'hover:scale-110',
                      )}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
                <p className="mt-2 font-body text-xs font-light text-muted-foreground">Selected colour: {colour.name}</p>
              </div>

              <p className="mt-3 font-body text-xs font-light text-muted-foreground">Your cover preview updates live on the left.</p>
            </div>
          )}

          {/* Quantity + actions */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="flex items-center rounded-full border border-border bg-white">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" className="grid h-11 w-11 place-items-center text-plum transition hover:text-royal"><Minus width={16} /></button>
              <span className="w-8 text-center font-body text-base font-medium text-plum">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} aria-label="Increase quantity" className="grid h-11 w-11 place-items-center text-plum transition hover:text-royal"><Plus width={16} /></button>
            </div>
            <button onClick={handleWish} className={cn('btn-secondary', wished && 'border-rose-300 text-rose-500')}>
              <Heart width={16} filled={wished} /> {wished ? 'Wishlisted' : 'Wishlist'}
            </button>
            <button onClick={share} aria-label="Share" className="grid h-11 w-11 place-items-center rounded-full border border-border text-royal transition hover:bg-lilac">
              <Share width={17} />
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => handleAddToCart(false)} disabled={onRequest} className="btn-primary btn-lg flex-1">Add to Cart</button>
            <button onClick={() => handleAddToCart(true)} disabled={onRequest} className="btn-secondary btn-lg flex-1">Buy Now</button>
          </div>
          {onRequest && (
            <p className="mt-3 font-body text-xs font-light text-muted-foreground">
              This configuration is priced on request — <Link to="/contact" className="link-underline">contact us</Link> for a quote.
            </p>
          )}

          {/* Trust strip */}
          <div className="mt-8 grid gap-3 border-t border-border pt-6 sm:grid-cols-3">
            {TRUST.map(({ Icon, t, d }) => (
              <div key={t} className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lilac text-royal"><Icon width={17} /></span>
                <div>
                  <p className="font-body text-xs font-medium text-plum">{t}</p>
                  <p className="font-body text-[11px] font-light text-muted-foreground">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer reviews */}
      <ProductReviews productId={prod.id} />

      {/* Related products */}
      <section className="container-suvadu py-16">
        <h2 className="font-display text-3xl text-plum">You may also like</h2>
        <div className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {(related.length ? related : fallbackRelated).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Zoom overlay */}
      {zoom && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-plum/70 p-6 backdrop-blur-sm animate-fade-in" onClick={() => setZoom(false)}>
          <button aria-label="Close" className="absolute right-6 top-6 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-plum hover:text-royal"><Close /></button>
          <div className="animate-fade-up" onClick={(e) => e.stopPropagation()} style={{ height: 'min(88vh, 760px)' }}>
            <ProductImage
              image={product.image}
              alt={product.name}
              colour={colour.hex}
              pattern={product.pattern}
              label={product.collectionName}
              customText={isCustom ? previewText || undefined : undefined}
              customFont={isCustom ? cFont : undefined}
              className="!h-full !w-auto shadow-lift"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function buildThumbs(selected: ColourOption, pattern: import('@/data/products').Pattern) {
  const others = COLOURS.filter((c) => c.name !== selected.name).slice(0, 3)
  return [selected, ...others].map((colour) => ({ colour, pattern }))
}

