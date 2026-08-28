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
import Stars from '@/components/Stars'
import { Heart, Share, Plus, Minus, Close, ChevronDown, Pen } from '@/components/Icons'
import { formatINR, cn } from '@/lib/utils'
import { openWhatsApp } from '@/lib/contact'
import { useSeo, SITE_URL } from '@/lib/seo'
import CatalogError from '@/components/CatalogError'
import NotFound from './NotFound'

/** How far the cover magnifies under the cursor. */
const ZOOM = 2.2

export default function ProductDetail() {
  const { slug = '' } = useParams()
  const { getProductBySlug, products, colours, loading, error: catalogError } = useCatalog()
  const product = getProductBySlug(slug)
  const navigate = useNavigate()
  const { addToCart, toggleWishlist, isWished, user } = useStore()
  const { notify } = useToast()

  const isCustom = product?.type === 'customized'

  // ── Size ────────────────────────────────────────────────────────────────
  // Offer every size the product is actually priced for. A5 is the standard;
  // A4 is stocked on request; Custom is quoted rather than priced, and the
  // "price on request" branch below handles it.
  const sizeOptions = useMemo<SizeKey[]>(() => {
    if (!product) return ['A5']
    const list: SizeKey[] = []
    if (product.prices.A5 != null) list.push('A5')
    if (product.prices.A4 != null) list.push('A4')
    if (product.prices.Custom != null || product.customPriceOnRequest) list.push('Custom')
    return list.length ? list : ['A5']
  }, [product])

  // The product arrives asynchronously, so neither of these can be a useState
  // initialiser — on first render there is no product to read a default from,
  // and a lazy initialiser only ever runs once. Hold the shopper's explicit
  // pick instead, and fall back to the product's own value until they make one.
  const [pickedSize, setPickedSize] = useState<SizeKey | null>(null)
  const [pickedColour, setPickedColour] = useState<ColourOption | null>(null)
  const size: SizeKey = pickedSize && sizeOptions.includes(pickedSize) ? pickedSize : sizeOptions[0]
  const colour: ColourOption = pickedColour ?? product?.colour ?? COLOURS[0]

  const [pages, setPages] = useState<number>(DEFAULT_PAGES)
  const [ruling, setRuling] = useState<'Ruled' | 'Unruled'>('Ruled')
  const [qty, setQty] = useState(1)
  const [thumb, setThumb] = useState(0)
  const [zoom, setZoom] = useState(false)
  // Cursor position over the cover, in %, while hovering — null when not hovering.
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null)
  // Personalise your cover: open by default for custom products
  const [showPersonalise, setShowPersonalise] = useState(isCustom)

  // The product loads async from the DB, so isCustom is false on first render —
  // open the personalise panel once we know it's a customized product.
  useEffect(() => { if (isCustom) setShowPersonalise(true) }, [isCustom])

  // Close the zoom overlay on Escape (keyboard accessibility).
  useEffect(() => {
    if (!zoom) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setZoom(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoom])

  // Customization state (only relevant for customized products)
  const [cName, setCName] = useState('')
  const [cText, setCText] = useState('')
  const [cFont, setCFont] = useState(FONT_OPTIONS[0])

  // Route param changes reuse this component rather than remounting it, so every
  // choice has to be reset by hand — otherwise the next product opens with the
  // last one's page count, ruling, quantity and personalisation still applied,
  // and `thumb` points at a swatch that no longer matches the rendered cover.
  useEffect(() => {
    setPickedSize(null)
    setPickedColour(null)
    setPages(DEFAULT_PAGES)
    setRuling('Ruled')
    setQty(1)
    setThumb(0)
    setCName('')
    setCText('')
    setCFont(FONT_OPTIONS[0])
  }, [slug])

  const related = useMemo(
    () => products.filter((p) => p.slug !== slug && p.collectionSlug === product?.collectionSlug).slice(0, 4),
    [slug, product, products],
  )
  const fallbackRelated = useMemo(() => products.filter((p) => p.slug !== slug).slice(0, 4), [slug, products])

  // Delivery estimate — 4 days out, matching the 2–4 day metro window quoted in
  // the shipping FAQ. Computed once per mount so it can't shift mid-session.
  const deliveryDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 4)
    return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
  }, [])

  // SEO meta (brief §11) — unique title + description per product, plus the cover
  // image (when present) so shared links unfurl with a picture. Child effects run
  // before parent ones, so the <NotFound /> below can't set its own title here —
  // this has to say "Page not found" or the tab, bookmark and history entry all
  // keep claiming to be a product that doesn't exist.
  useSeo(
    product?.name ?? (loading ? 'Product' : 'Page not found'),
    product?.description,
    product?.image ?? undefined,
  )

  if (loading && !product) {
    return (
      <div className="container-suvadu py-24 text-center font-body text-sm font-light text-muted-foreground">
        Loading…
      </div>
    )
  }
  // Distinguish "this product doesn't exist" from "we couldn't load anything".
  if (!product && catalogError) return <CatalogError />
  if (!product) return <NotFound />
  const prod = product // narrowed (non-undefined) — safe to capture in closures below

  const wished = isWished(prod.id)
  const basePrice = product.prices[size]
  const onRequest = basePrice == null
  // Page count scales the price (listed price is for 160 pages).
  const unitPrice = basePrice == null ? null : priceForPages(basePrice, pages)

  // Inventory (stock == null means untracked → always available).
  const stock = prod.stock ?? null
  const outOfStock = stock === 0
  const lowStock = stock != null && stock > 0 && stock <= 5
  const maxQty = stock != null && stock > 0 ? stock : Infinity

  const previewText = cName || cText
  const thumbs = buildThumbs(colour, product.pattern)
  // An admin-uploaded photo is a single view — the colour thumbs only make sense
  // for the generated cover, where each one is a real alternative.
  const showThumbs = !product.image

  // Product structured data (brief §11 — Product schema).
  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: prod.name,
    description: prod.description,
    category: prod.collectionName,
    brand: { '@type': 'Brand', name: 'SUVADU Notebooks' },
    // Only advertise an aggregateRating when there are real reviews — emitting
    // reviewCount: 0 is invalid schema and risks a structured-data penalty.
    ...(prod.reviews > 0
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: prod.rating, reviewCount: prod.reviews } }
      : {}),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: basePrice ?? prod.prices.A5 ?? prod.prices.A4 ?? 0,
      availability: outOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      url: `${SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/products/${prod.slug}`,
    },
  }

  function handleAddToCart(redirect = false) {
    if (onRequest) {
      notify('This size is priced on request — we’ll be in touch with a quote.')
      return
    }
    if (outOfStock) {
      notify('This notebook is currently out of stock.')
      return
    }
    if (stock != null && qty > stock) {
      notify(`Only ${stock} left in stock.`)
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
        crumbs={[
          { label: 'Collections', to: '/collections' },
          { label: product.collectionName, to: `/collections/${product.collectionSlug}` },
          { label: product.name },
        ]}
      />

      {/* Editorial layout: cover on the left, only the decision-critical copy on
          the right. Everything else lives behind the three disclosures at the
          bottom, so the page stays quiet. */}
      <section className="relative py-12 sm:py-16 lg:py-20">
        {/* The site-wide aurora is too saturated to sit behind this much empty
            space. A white radial that fades to nothing calms the middle of the
            page without drawing a card edge around it. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_60%_at_50%_45%,rgba(255,255,255,0.9),rgba(255,255,255,0)_75%)]"
        />
        <div className="container-suvadu relative mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20 xl:gap-28">
            {/* ── Cover (left) ─────────────────────────────────────────── */}
            <div>
              {/* Hover magnifies the cover in place and pans with the cursor.
                  Touch devices never fire mousemove, so they fall through to
                  tap-to-enlarge instead. */}
              <div
                className="relative overflow-hidden rounded-2xl bg-white"
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect()
                  setLens({
                    x: ((e.clientX - r.left) / r.width) * 100,
                    y: ((e.clientY - r.top) / r.height) * 100,
                  })
                }}
                onMouseLeave={() => setLens(null)}
              >
                <button
                  type="button"
                  onClick={() => setZoom(true)}
                  className="block w-full cursor-zoom-in"
                  aria-label="Enlarge image"
                >
                  {/* Only `transform` transitions, so the scale eases in and out
                      while the origin (the pan) tracks the cursor instantly. */}
                  <div
                    className="transition-transform duration-300 ease-out will-change-transform"
                    style={lens ? { transform: `scale(${ZOOM})`, transformOrigin: `${lens.x}% ${lens.y}%` } : undefined}
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
                  </div>
                </button>
              </div>

              {showThumbs && (
                <div className="mt-5 flex gap-3">
                  {thumbs.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => { setThumb(i); setPickedColour(t.colour) }}
                      className={cn(
                        'w-14 overflow-hidden rounded-lg transition',
                        thumb === i ? 'ring-2 ring-royal ring-offset-2' : 'opacity-70 hover:opacity-100',
                      )}
                      aria-label={`View ${t.colour.name}`}
                      aria-pressed={thumb === i}
                    >
                      <NotebookCover colour={t.colour.hex} pattern={t.pattern} className="!aspect-square" />
                    </button>
                  ))}
                </div>
              )}

              <p className="mt-5 font-body text-xs font-light text-muted-foreground">
                Hover to zoom · click to enlarge
              </p>
            </div>

            {/* ── Details (right) ──────────────────────────────────────── */}
            <div className="max-w-md">
              <Link to={`/collections/${product.collectionSlug}`} className="eyebrow">
                {product.collectionName}
              </Link>

              <h1 className="mt-4 text-balance font-display text-3xl leading-tight text-plum sm:text-4xl">
                {product.name}
              </h1>

              {product.reviews > 0 && (
                <a href="#reviews" className="mt-4 inline-flex items-center gap-2 hover:opacity-70">
                  <Stars rating={product.rating} size={14} />
                  <span className="font-body text-xs font-light text-muted-foreground">
                    {product.rating.toFixed(1)} · {product.reviews} reviews
                  </span>
                </a>
              )}

              <p className="mt-8 font-body text-2xl font-medium text-plum">
                {onRequest ? <span className="font-display text-royal">Price on request</span> : formatINR(unitPrice as number)}
              </p>
              <p className="mt-1.5 font-body text-xs font-light text-muted-foreground">
                Free delivery across India
              </p>

              <p className="mt-8 font-body text-base font-light leading-relaxed text-muted-foreground">
                {product.description}
              </p>

              {/* Choices — two quiet rows */}
              <div className="mt-12 space-y-6">
                {sizeOptions.length > 1 && (
                  <Choice
                    label="Size"
                    options={sizeOptions.map((sz) => ({ value: sz, label: sz }))}
                    value={size}
                    onChange={setPickedSize}
                  />
                )}
                <Choice
                  label="Pages"
                  options={PAGE_OPTIONS.map((p) => ({ value: p, label: String(p) }))}
                  value={pages}
                  onChange={setPages}
                />
                <Choice
                  label="Style"
                  options={[{ value: 'Ruled' as const, label: 'Ruled' }, { value: 'Unruled' as const, label: 'Unruled' }]}
                  value={ruling}
                  onChange={setRuling}
                />
              </div>

              {/* Personalisation — customized products only (brief §7.2) */}
              {isCustom && showPersonalise && (
                <div className="mt-10 border-t border-border pt-8">
                  <h2 className="flex items-center gap-2 font-display text-xl text-plum">
                    <Pen width={17} className="text-royal" /> Personalise your cover
                  </h2>
                  <div className="mt-5 space-y-4">
                    <label className="block">
                      <span className="mb-1.5 block font-body text-xs font-light text-muted-foreground">Name on cover</span>
                      <input value={cName} onChange={(e) => setCName(e.target.value)} maxLength={20} placeholder="e.g. Ananya" className="field" />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block font-body text-xs font-light text-muted-foreground">Custom text (optional)</span>
                      <input value={cText} onChange={(e) => setCText(e.target.value)} maxLength={32} placeholder="A short line, quote or date" className="field" />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block font-body text-xs font-light text-muted-foreground">Font</span>
                      <select value={cFont} onChange={(e) => setCFont(e.target.value)} className="field cursor-pointer">
                        {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </label>
                  </div>

                  <div className="mt-5">
                    <span className="mb-2.5 block font-body text-xs font-light text-muted-foreground">Cover colour — {colour.name}</span>
                    <div className="flex flex-wrap gap-2.5">
                      {colours.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setPickedColour(c)}
                          aria-label={c.name}
                          aria-pressed={colour.name === c.name}
                          title={c.name}
                          className={cn(
                            'h-7 w-7 rounded-full border border-border transition',
                            colour.name === c.name ? 'ring-2 ring-royal ring-offset-2' : 'hover:scale-110',
                          )}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Availability only speaks up when it matters — "In stock" on every
                  product is noise. */}
              {(outOfStock || lowStock) && (
                <p className={cn('mt-8 font-body text-sm', outOfStock ? 'text-rose-600' : 'text-amber-600')}>
                  {outOfStock ? 'Currently unavailable' : `Only ${stock} left`}
                </p>
              )}

              {/* Buy */}
              <div className="mt-10 flex items-center gap-4">
                <div className="flex shrink-0 items-center rounded-full border border-border bg-white">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" className="grid h-11 w-11 place-items-center text-plum transition hover:text-royal"><Minus width={15} /></button>
                  <span className="w-7 text-center font-body text-sm font-medium text-plum">{qty}</span>
                  <button onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} aria-label="Increase quantity" className="grid h-11 w-11 place-items-center text-plum transition hover:text-royal disabled:opacity-40"><Plus width={15} /></button>
                </div>
                <button onClick={() => handleAddToCart(false)} disabled={onRequest || outOfStock} className="btn-primary btn-lg flex-1">
                  {outOfStock ? 'Out of Stock' : 'Add to Cart'}
                </button>
              </div>

              {/* Secondary actions stay as quiet text, not competing buttons. */}
              <div className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-2">
                {!onRequest && !outOfStock && (
                  <button onClick={() => handleAddToCart(true)} className="link-underline font-body text-xs">
                    Buy it now
                  </button>
                )}
                <button onClick={handleWish} aria-pressed={wished} className={cn('inline-flex items-center gap-1.5 font-body text-xs font-light transition hover:text-royal', wished ? 'text-rose-500' : 'text-muted-foreground')}>
                  <Heart width={14} filled={wished} /> {wished ? 'Saved' : 'Save'}
                </button>
                <button onClick={share} className="inline-flex items-center gap-1.5 font-body text-xs font-light text-muted-foreground transition hover:text-royal">
                  <Share width={13} /> Share
                </button>
              </div>

              {onRequest ? (
                <p className="mt-6 font-body text-xs font-light leading-relaxed text-muted-foreground">
                  Priced on request —{' '}
                  <button type="button" onClick={() => openWhatsApp(`Hi Suvadu! I'd like a quote for: ${prod.name}`)} className="link-underline">
                    message us on WhatsApp
                  </button>{' '}
                  for a quote.
                </p>
              ) : (
                <p className="mt-6 font-body text-xs font-light text-muted-foreground">
                  Free delivery · arrives by {deliveryDate}
                </p>
              )}

              {/* Everything else, folded away */}
              <div className="mt-12 border-t border-border">
                <Disclosure title="Details">
                  <ul className="space-y-1.5">
                    {prod.specs.map((s) => (
                      <li key={s} className="flex gap-2.5">
                        <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-royal" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </Disclosure>
                <Disclosure title="Size & paper">
                  <p>{size} — {SIZE_INFO[size].dims}. 100 GSM premium paper with lay-flat thread binding, {pages} pages, {ruling.toLowerCase()}.</p>
                  {sizeOptions.length > 1 && (
                    <p className="mt-2">{SIZE_INFO[size].note}</p>
                  )}
                </Disclosure>
                <Disclosure title="Shipping & returns">
                  <p>
                    Free delivery across India, tracked via Shiprocket — 2–4 business days to metros, 4–7 elsewhere.
                    Unused, non-personalised notebooks can be returned within 7 days. Personalised items are made to
                    order and can only be returned if they arrive damaged.
                  </p>
                </Disclosure>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer reviews */}
      <ProductReviews productId={prod.id} />

      {/* Related products */}
      <section className="container-suvadu py-16 sm:py-20">
        <h2 className="font-display text-2xl text-plum sm:text-3xl">You may also like</h2>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {(related.length ? related : fallbackRelated).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Enlarged overlay */}
      {zoom && (
        <div role="dialog" aria-modal="true" aria-label={`${product.name} enlarged`} className="fixed inset-0 z-[90] flex items-center justify-center bg-plum/70 p-4 backdrop-blur-sm animate-fade-in sm:p-6" onClick={() => setZoom(false)}>
          <button aria-label="Close" onClick={() => setZoom(false)} className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-plum hover:text-royal sm:right-6 sm:top-6"><Close /></button>
          {/* Sized by width, not height: the cover is 3:4, so a height-driven
              88vh box came out wider than a phone viewport and clipped. 66vh is
              that same height expressed as a width (88vh × 3/4), and min() picks
              whichever constraint binds first. */}
          <div
            className="animate-fade-up"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(100%, 66vh, 570px)' }}
          >
            <ProductImage
              image={product.image}
              alt={product.name}
              colour={colour.hex}
              pattern={product.pattern}
              label={product.collectionName}
              customText={isCustom ? previewText || undefined : undefined}
              customFont={isCustom ? cFont : undefined}
              className="shadow-lift"
            />
          </div>
        </div>
      )}
    </div>
  )
}

/** Label on the left, a small segmented track on the right. */
function Choice<T extends string | number>({ label, options, value, onChange }: {
  label: string
  options: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="font-body text-sm font-light text-muted-foreground">{label}</span>
      <div className="inline-flex rounded-full border border-border bg-white p-1">
        {options.map((o) => (
          <button
            key={String(o.value)}
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={cn(
              'rounded-full px-5 py-1.5 font-body text-sm transition',
              value === o.value ? 'bg-royal text-white' : 'text-muted-foreground hover:text-plum',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Native <details> — no state, no library, keyboard-accessible for free. */
function Disclosure({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-border">
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 font-body text-sm font-medium text-plum [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown width={16} className="text-muted-foreground transition group-open:rotate-180" />
      </summary>
      <div className="pb-5 font-body text-sm font-light leading-relaxed text-muted-foreground">
        {children}
      </div>
    </details>
  )
}

function buildThumbs(selected: ColourOption, pattern: import('@/data/products').Pattern) {
  const others = COLOURS.filter((c) => c.name !== selected.name).slice(0, 3)
  return [selected, ...others].map((colour) => ({ colour, pattern }))
}
