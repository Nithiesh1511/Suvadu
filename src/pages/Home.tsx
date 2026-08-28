import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { REVIEWS } from '@/data/products'
import { useCatalog } from '@/context/CatalogContext'
import { supabase, type BannerRow, type ReviewRow } from '@/lib/supabase'
import ProductCard from '@/components/ProductCard'
import NotebookCover from '@/components/NotebookCover'
import Testimonials from '@/components/Testimonials'
import { ProductGridSkeleton, CollectionGridSkeleton } from '@/components/Skeleton'
import { ArrowRight, Truck, Leaf, Sparkle, Pen, Instagram } from '@/components/Icons'

// Lazy so three.js stays out of the initial bundle.
const NotebookPreview3D = lazy(() => import('@/components/NotebookPreview3D'))

// Full-width banner, sized like the promotional banners above.
const STAGE_3D_H = 'h-[420px] sm:h-[500px] lg:h-[580px]'

function Stage3DFallback() {
  return (
    <div className={`grid ${STAGE_3D_H} place-items-center bg-lilac/40 font-body text-sm font-light text-muted-foreground`}>
      Loading 3D preview…
    </div>
  )
}

/** "Our story": the copy reads first, then the 3D notebook takes a full-width
 *  banner to itself. The notebook sits dead centre on its stage — as in the
 *  prototype — so nothing is overlaid on top of it. */
function Story3DBanner() {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="eyebrow mb-3">Our story</p>
          <h2 className="font-display text-2xl leading-tight text-plum sm:text-4xl">A notebook is where ideas begin.</h2>
          <p className="mt-3 max-w-xl font-body text-sm font-light leading-relaxed text-muted-foreground sm:text-base">
            SUVADU began with a simple belief — that the things you write in should feel as considered as the things you write. We obsess over paper weight, cover texture and the quiet joy of a page that lies flat.
          </p>
          <p className="mt-3 max-w-xl font-body text-sm font-light leading-relaxed text-muted-foreground sm:text-base">
            From minimal aesthetics to fully personalised covers, every Suvadu notebook is made to help you make your mark.
          </p>
        </div>
        <Link to="/about" className="link-underline inline-flex items-center gap-1.5 pb-1">
          Read Our Story <ArrowRight width={15} />
        </Link>
      </div>

      <div className="mt-10 overflow-hidden rounded-[2rem] border border-royal/10 shadow-lift ring-1 ring-white/60">
        <WhenVisible fallback={<Stage3DFallback />}>
          <Suspense fallback={<Stage3DFallback />}>
            <NotebookPreview3D variant="showcase" className={STAGE_3D_H} />
          </Suspense>
        </WhenVisible>
      </div>
    </div>
  )
}

export default function Home() {
  const { collections, getBestSellers, loading, error: catalogError } = useCatalog()
  const featured = collections.slice(0, 6)
  const bestSellers = getBestSellers()
  const [banners, setBanners] = useState<BannerRow[]>([])
  const [dbReviews, setDbReviews] = useState<ReviewRow[]>([])

  useEffect(() => {
    let active = true
    supabase.from('banners').select('*').eq('active', true).order('sort_order').then(({ data }) => {
      if (active) setBanners((data as BannerRow[]) ?? [])
    })
    supabase.from('reviews').select('*').eq('status', 'approved').order('created_at', { ascending: false }).limit(8).then(({ data }) => {
      if (active) setDbReviews((data as ReviewRow[]) ?? [])
    })
    return () => { active = false }
  }, [])

  // Prefer admin-approved reviews; fall back to the static seed if none yet.
  const displayReviews = dbReviews.length
    ? dbReviews.map((r) => ({ name: r.author_name, rating: r.rating, text: r.text, location: r.location ?? '' }))
    : REVIEWS

  return (
    <div>
      {/* 1. HERO BANNER */}
      <section className="gradient-hero relative overflow-hidden bg-grain">
        <div className="container-suvadu grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-up">
            <p className="eyebrow mb-5">Suvadu Notebooks · Pan-India</p>
            <h1 className="text-balance font-display text-[2.75rem] leading-[1.05] text-plum xs:text-5xl sm:text-6xl lg:text-7xl">
              Make your <span className="italic text-royal">mark.</span>
            </h1>
            <p className="mt-6 max-w-md font-body text-base font-light leading-relaxed text-muted-foreground sm:text-lg">
              Minimal, aesthetic notebooks crafted for the thinking mind. Premium paper, considered covers, and the option to make every page unmistakably yours.
            </p>
            <div className="mt-8">
              <Link to="/collections" className="btn-primary btn-lg">Shop Now</Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 font-body text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><Truck width={18} className="shrink-0 text-royal" /> Pan-India delivery</span>
              <span className="flex items-center gap-2"><Pen width={18} className="shrink-0 text-royal" /> Personalisation available</span>
              <span className="flex items-center gap-2"><Leaf width={18} className="shrink-0 text-royal" /> 100 GSM premium paper</span>
            </div>
          </div>

          {/* Hero visual — fanned notebooks. Labelled with real collections: they
              used to read "Inspire Ink", "Her Journal" and "Midnight", none of
              which the shop sells, so the first thing the hero did was advertise
              four things you couldn't buy. */}
          <HeroCovers />
        </div>
      </section>

      {/* marquee */}
      <div className="overflow-hidden border-y border-border bg-plum py-3 text-white">
        <div className="flex w-max animate-marquee gap-12 whitespace-nowrap font-display text-lg italic">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k} className="flex gap-12">
              {['Make your mark.', 'Premium paper.', 'Personalise it.', 'For the thinking mind.', 'Gift-ready.', 'Crafted in India.'].map((t) => (
                <span key={t} className="flex items-center gap-12"><span>{t}</span><span className="text-royal-300">✦</span></span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Promotional banner (admin-managed) */}
      {banners.length > 0 && (
        <section className="container-suvadu pt-12">
          {banners.slice(0, 1).map((b) => {
            const Inner = (
              <div
                className="relative flex min-h-[150px] items-center overflow-hidden rounded-2xl border border-border bg-plum px-5 py-8 text-white shadow-card sm:min-h-[180px] sm:rounded-3xl sm:px-12 sm:py-10"
                style={b.image_url ? { backgroundImage: `url(${b.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
              >
                {b.image_url && <span className="absolute inset-0 bg-plum/45" />}
                <div className="relative max-w-xl">
                  {b.title && <h2 className="font-display text-2xl text-white sm:text-4xl">{b.title}</h2>}
                  {b.subtitle && <p className="mt-2 font-body text-sm font-light text-white/80">{b.subtitle}</p>}
                </div>
              </div>
            )
            return b.link
              ? <Link key={b.id} to={b.link} className="block transition hover:-translate-y-0.5">{Inner}</Link>
              : <div key={b.id}>{Inner}</div>
          })}
        </section>
      )}

      {/* 2. FEATURED COLLECTIONS */}
      <section className="container-suvadu py-14 sm:py-20">
        <SectionHead
          eyebrow="Curated for you"
          title="Featured Collections"
          subtitle={`${collections.length || ''} ${collections.length === 1 ? 'world' : 'worlds'} to write in — each with its own voice.`.trim()}
          link={{ to: '/collections', label: 'View all' }}
        />
        {catalogError ? (
          <CatalogRetryNotice />
        ) : loading ? (
          <div className="mt-10"><CollectionGridSkeleton count={6} /></div>
        ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((col) => (
            <Link
              key={col.slug}
              to={`/collections/${col.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-border shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
            >
              {/* An admin-uploaded cover fills the frame; without one we fall back
                  to the generated notebook on the accent colour. */}
              <div className="flex aspect-[16/10] items-center justify-center overflow-hidden" style={{ backgroundColor: col.accent }}>
                {col.image ? (
                  <img
                    src={col.image}
                    alt={col.displayName}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-28 rotate-[-4deg] transition-transform duration-500 group-hover:rotate-0 group-hover:scale-105">
                    <NotebookCover colour={col.accent} pattern={col.pattern} label={col.displayName} />
                  </div>
                )}
              </div>
              <div className="bg-white p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-2xl text-plum">{col.displayName}</h3>
                  <span className="badge-soft">{col.count} {col.count === 1 ? 'product' : 'products'}</span>
                </div>
                <p className="mt-2 font-body text-sm font-light leading-relaxed text-muted-foreground">{col.description}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 font-body text-xs font-medium uppercase tracking-cta text-royal">
                  View Collection <ArrowRight width={15} className="transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
        )}
      </section>

      {/* 3. BEST SELLERS */}
      <section className="bg-lilac/40 py-14 sm:py-20">
        <div className="container-suvadu">
          <SectionHead eyebrow="Loved most" title="Best Sellers" subtitle="The notebooks our customers keep coming back for." />
          <div className="mt-10">
            {catalogError ? (
              <CatalogRetryNotice />
            ) : loading ? (
              <ProductGridSkeleton count={4} />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                {bestSellers.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </div>
          <div className="mt-10 text-center">
            <Link to="/collections?filter=bestseller" className="btn-primary btn-lg">Shop Best Sellers</Link>
          </div>
        </div>
      </section>

      {/* 4. ABOUT SUVADU (short) */}
      <section className="container-suvadu py-14 sm:py-20">
        <Story3DBanner />
      </section>

      {/* Value props */}
      <section className="container-suvadu pb-4">
        <div className="grid gap-4 rounded-2xl border border-border bg-white p-6 shadow-card sm:grid-cols-3 sm:p-8">
          {[
            { Icon: Sparkle, t: 'Premium quality', d: '100 GSM paper, lay-flat binding, soft-touch covers.' },
            { Icon: Pen, t: 'Make it yours', d: 'Add your name, text, font and colour on customised notebooks.' },
            { Icon: Truck, t: 'Pan-India delivery', d: 'Fast, tracked shipping via Shiprocket to your door.' },
          ].map(({ Icon, t, d }) => (
            <div key={t} className="flex gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-lilac text-royal"><Icon /></span>
              <div>
                <h3 className="font-display text-lg text-plum">{t}</h3>
                <p className="mt-1 font-body text-sm font-light text-muted-foreground">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. CUSTOMER REVIEWS — drifting ribbon, full-bleed, no heading of its own */}
      <section className="relative overflow-hidden py-14 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-grain opacity-80"
          style={{ background: 'linear-gradient(180deg, rgba(243,232,255,0) 0%, rgba(243,232,255,0.7) 45%, rgba(243,232,255,0) 100%)' }}
        />
        <Testimonials reviews={displayReviews} />
      </section>

      {/* 6. NEWSLETTER */}
      <section className="container-suvadu pb-14 sm:pb-20">
        <NewsletterBanner />
      </section>

      {/* 7. INSTAGRAM FEED */}
      <section className="container-suvadu pb-14 sm:pb-20">
        <SectionHead eyebrow="@suvadu.notebooks" title="From the Suvadu journal" link={{ to: 'https://www.instagram.com/suvadu.notebooks/', label: 'Follow us', external: true }} />
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {collections.concat(collections).slice(0, 6).map((c, i) => (
            <a
              key={i}
              href="https://www.instagram.com/suvadu.notebooks/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow @suvadu.notebooks on Instagram"
              className="group relative aspect-square overflow-hidden rounded-xl"
              style={{ backgroundColor: c.accent }}
            >
              <NotebookCover colour={c.accent} pattern={c.pattern} label={c.displayName} rounded={false} className="!aspect-square" />
              <span className="absolute inset-0 grid place-items-center bg-plum/0 text-white opacity-0 transition group-hover:bg-plum/40 group-hover:opacity-100">
                <Instagram width={26} height={26} />
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}

// Renders children only once the placeholder scrolls near the viewport, so the
// heavy three.js chunk is fetched on intent (scroll) rather than on every load.
/** The catalogue didn't load. Say so inline — the rest of the home page is
 *  static and still worth reading — and give the shopper a retry. */
function CatalogRetryNotice() {
  const { refresh, loading } = useCatalog()
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-border py-12 text-center">
      <p className="font-display text-xl text-plum">We couldn’t load the shop</p>
      <p className="mx-auto mt-2 max-w-sm font-body text-sm font-light text-muted-foreground">
        A connection problem on our side, not a missing page.
      </p>
      <button onClick={() => void refresh()} disabled={loading} className="btn-secondary mt-5 disabled:opacity-60">
        {loading ? 'Retrying…' : 'Try again'}
      </button>
    </div>
  )
}

function WhenVisible({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || visible) return
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect() } },
      { rootMargin: '200px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [visible])
  return <div ref={ref}>{visible ? children : fallback}</div>
}

export function SectionHead({ eyebrow, title, subtitle, link }: {
  eyebrow?: string
  title: string
  subtitle?: string
  link?: { to: string; label: string; external?: boolean }
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h2 className="font-display text-2xl leading-tight text-plum sm:text-4xl">{title}</h2>
        {subtitle && <p className="mt-3 max-w-xl font-body text-sm font-light text-muted-foreground sm:text-base">{subtitle}</p>}
      </div>
      {link && (
        link.external ? (
          <a href={link.to} target="_blank" rel="noopener noreferrer" className="link-underline inline-flex items-center gap-1.5 pb-1">{link.label} <ArrowRight width={15} /></a>
        ) : (
          <Link to={link.to} className="link-underline inline-flex items-center gap-1.5 pb-1">{link.label} <ArrowRight width={15} /></Link>
        )
      )}
    </div>
  )
}

/** The fanned notebooks in the hero, labelled with collections that exist.
 *  Falls back to unlabelled covers until the catalogue lands, rather than
 *  inventing names to fill the space. */
function HeroCovers() {
  const { collections } = useCatalog()
  const positions = [
    'absolute left-[6%] top-10 w-48 -rotate-[10deg]',
    'absolute left-[34%] top-0 z-10 w-52 rotate-[3deg]',
    'absolute right-[4%] top-14 w-48 rotate-[11deg]',
    'absolute bottom-2 left-[26%] z-20 w-44 -rotate-[3deg]',
  ]
  const fallback = [
    { colour: '#E6E6FA', pattern: 'plain' as const },
    { colour: '#613092', pattern: 'mono' as const },
    { colour: '#FF8DA1', pattern: 'floral' as const },
    { colour: '#36454F', pattern: 'dots' as const },
  ]
  const shown = collections.slice(0, 4)

  return (
    <div className="relative hidden h-[440px] lg:block">
      {positions.map((pos, i) => {
        const col = shown[i]
        const cover = col
          ? <NotebookCover colour={col.accent} pattern={col.pattern} label={col.displayName} />
          : <NotebookCover colour={fallback[i].colour} pattern={fallback[i].pattern} />
        const cls = `${pos} shadow-lift transition-transform duration-500 hover:-translate-y-2`
        return col
          ? <Link key={col.slug} to={`/collections/${col.slug}`} className={cls}>{cover}</Link>
          : <div key={i} aria-hidden className={cls}>{cover}</div>
      })}
    </div>
  )
}

function NewsletterBanner() {
  // Only promise the discount if the coupon behind it is actually live — the
  // headline used to advertise 10% off unconditionally, and subscribing then
  // delivered nothing at all.
  const [offer, setOffer] = useState<WelcomeOffer | null>(null)
  useEffect(() => {
    let active = true
    fetchWelcomeOffer().then((o) => { if (active) setOffer(o) })
    return () => { active = false }
  }, [])

  return (
    <div className="relative overflow-hidden rounded-2xl bg-plum px-5 py-12 text-center text-white sm:rounded-3xl sm:px-12 sm:py-14">
      <div className="pointer-events-none absolute inset-0 opacity-30 bg-grain" />
      <div className="relative mx-auto max-w-2xl">
        <p className="font-body text-[11px] font-medium uppercase tracking-[0.18em] text-royal-200 sm:text-xs sm:tracking-[0.24em]">Join the Suvadu circle</p>
        <h2 className="mt-4 font-display text-2xl text-white sm:text-4xl">
          {offer ? `Get ${offer.pct}% off your first notebook` : 'Never miss a new collection'}
        </h2>
        <p className="mt-3 font-body text-sm font-light text-white/70">Subscribe for new collections, restocks and a little inspiration.</p>
        <NewsletterForm offer={offer} />
      </div>
    </div>
  )
}

import { useToast } from '@/components/Toast'
import { isEmail } from '@/lib/utils'
import { fetchWelcomeOffer, type WelcomeOffer } from '@/lib/welcome'
function NewsletterForm({ offer }: { offer: WelcomeOffer | null }) {
  const { notify } = useToast()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [claimed, setClaimed] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = email.trim().toLowerCase()
    if (!isEmail(value)) { notify('Please enter a valid email address.'); return }
    setBusy(true)
    const { error } = await supabase.from('newsletter_subscribers').upsert({ email: value }, { onConflict: 'email' })
    setBusy(false)
    if (error) { notify('Could not subscribe right now — please try again.'); return }
    // There is no transactional email here, so the code is handed over on the
    // spot rather than promised and never sent.
    notify(offer ? `Subscribed — your code is ${offer.code}` : 'Subscribed — welcome to Suvadu!')
    setClaimed(true)
    setEmail('')
  }

  if (claimed) {
    return (
      <div className="mx-auto mt-7 max-w-md rounded-2xl bg-white/10 px-5 py-6 ring-1 ring-white/20">
        <p className="font-display text-xl text-white">You’re in.</p>
        {offer ? (
          <>
            <p className="mt-1.5 font-body text-sm font-light text-white/75">
              Use this code at checkout for {offer.pct}% off your first notebook.
            </p>
            <p className="mt-4 select-all rounded-xl bg-white px-4 py-3 font-body text-lg font-medium tracking-[0.18em] text-royal">
              {offer.code}
            </p>
            <Link to="/collections" className="mt-4 inline-flex items-center gap-1.5 font-body text-sm font-medium text-royal-200 hover:text-white">
              Start shopping <ArrowRight width={15} />
            </Link>
          </>
        ) : (
          <p className="mt-1.5 font-body text-sm font-light text-white/75">
            We’ll be in touch with new collections and restocks.
          </p>
        )}
      </div>
    )
  }

  return (
    // Stacks below xs: an email field and a "Subscribing…" button can't share a
    // 300px-wide pill without the input collapsing to a few characters.
    <form onSubmit={submit} className="mx-auto mt-7 flex max-w-md flex-col gap-2 rounded-2xl bg-white p-2 xs:flex-row xs:gap-0 xs:rounded-full xs:p-1.5">
      <label htmlFor="home-newsletter" className="sr-only">Email address for newsletter</label>
      <input
        id="home-newsletter"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        className="w-full min-w-0 bg-transparent px-4 py-2 font-body text-base text-plum outline-none placeholder:text-muted-foreground/60 xs:px-5 xs:py-0 sm:text-sm"
      />
      <button type="submit" disabled={busy} className="btn-primary shrink-0 disabled:opacity-60">{busy ? 'Subscribing…' : 'Subscribe'}</button>
    </form>
  )
}
