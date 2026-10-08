import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { REVIEWS } from '@/data/products'
import { useCatalog } from '@/context/CatalogContext'
import { supabase, type BannerRow, type ReviewRow } from '@/lib/supabase'
import ProductCard from '@/components/ProductCard'
import NotebookCover from '@/components/NotebookCover'
import ProductImage from '@/components/ProductImage'
import Testimonials from '@/components/Testimonials'
import FlyingNotebookStage from '@/components/flying-notebook/FlyingNotebookStage'
import { useToast } from '@/components/Toast'
import { ProductGridSkeleton, CollectionGridSkeleton } from '@/components/Skeleton'
import { ArrowRight, Truck, Leaf, Sparkle, Spark4, Pen, Instagram } from '@/components/Icons'
import Reveal from '@/components/Reveal'
import { REVEAL, REVEAL_FADE, CASCADE } from '@/lib/motion'
import { cn, isEmail } from '@/lib/utils'
import { fetchWelcomeOffer, type WelcomeOffer } from '@/lib/welcome'

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
      {/* 1. HERO — the flying notebook's first stage */}
      <section className="gradient-hero relative overflow-hidden">
        <div aria-hidden className="paper-rules pointer-events-none absolute inset-0" />
        <Spark4 className="twinkle pointer-events-none absolute left-[9%] top-[16%] h-4 w-4 text-royal-300" />
        <Spark4 className="twinkle pointer-events-none absolute left-[46%] top-[9%] h-3 w-3 text-royal-400" style={{ animationDelay: '1.4s' }} />
        <Spark4 className="twinkle pointer-events-none absolute bottom-[14%] left-[40%] h-5 w-5 text-royal-200" style={{ animationDelay: '2.6s' }} />

        <div className="container-suvadu relative grid items-center gap-x-10 gap-y-2 pb-14 pt-10 lg:grid-cols-[1.02fr_1fr] lg:pb-20 lg:pt-14">
          <div className="animate-fade-up">
            <p className="eyebrow-chip mb-6"><Spark4 width={13} height={13} /> Suvadu Notebooks</p>
            <h1 className="text-balance font-display text-[2.75rem] leading-[1.02] text-plum xs:text-5xl sm:text-6xl lg:text-[5.25rem]">
              Make your<br />
              <span className="relative inline-block italic text-ink">
                mark.
                <svg className="ink-underline" viewBox="0 0 220 22" aria-hidden>
                  <path d="M4 15C38 4 74 20 112 11S182 4 216 12" pathLength="1" />
                </svg>
              </span>
            </h1>

            {/* Small screens: the notebook sits between headline and copy, inside the first screenful. */}
            <div className="relative mx-auto my-5 h-[290px] w-full max-w-[340px] lg:hidden">
              <div aria-hidden className="hero-orb"><div className="hero-disc" /></div>
              <FlyingNotebookStage id="hero-m" fit={0.92} rotY={0.5} leaveAt={0.55} className="absolute inset-0">
                <StageFallback />
              </FlyingNotebookStage>
            </div>

            <p className="mt-6 max-w-md font-body text-base font-light leading-relaxed text-muted-foreground sm:text-lg">
              Minimal, aesthetic notebooks crafted for the thinking mind. Premium paper, considered covers, and the option to make every page unmistakably yours.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/collections" className="btn-primary btn-lg">Shop Now <ArrowRight width={16} /></Link>
              <Link to="/special-collections" className="btn-secondary btn-lg">Personalise yours</Link>
            </div>
            <ul className="mt-9 flex flex-wrap gap-2.5 font-body text-[13px] text-plum/80">
              {[
                { Icon: Truck, t: 'Pan-India delivery' },
                { Icon: Pen, t: 'Personalisation available' },
                { Icon: Leaf, t: '100 GSM premium paper' },
              ].map(({ Icon, t }) => (
                <li key={t} className="inline-flex items-center gap-2 rounded-full border border-royal/15 bg-white/70 px-3.5 py-2 backdrop-blur">
                  <Icon width={16} className="shrink-0 text-royal" /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Desktop showcase: the notebook on a lilac disc, collections peeking out behind it. */}
          <div className="relative mx-auto hidden h-[500px] w-full max-w-[560px] lg:block xl:h-[540px]">
            <div aria-hidden className="hero-orb"><div className="hero-disc" /><div className="hero-ring" /></div>
            <HeroCovers />
            <FlyingNotebookStage id="hero" fit={0.9} rotY={0.5} leaveAt={0.82} className="absolute inset-x-[12%] inset-y-[5%]">
              <StageFallback />
            </FlyingNotebookStage>
            {/* The book fills most of the disc, so the chips live in the strips above
                and below it rather than behind it. */}
            <span className="chip-float absolute -bottom-1 left-[6%]"><Leaf width={15} className="text-royal" /> 100 GSM paper</span>
            <span className="chip-float absolute right-[2%] top-[1%]" style={{ animationDelay: '2.2s' }}><Sparkle width={15} className="text-royal" /> Lay-flat binding</span>
            <span className="chip-float absolute left-[5%] top-[-1%]" style={{ animationDelay: '4s' }}><Pen width={15} className="text-royal" /> Made to trace</span>
          </div>
        </div>
      </section>

      {/* marquee — a stitched strip */}
      <div className="strip-stitch overflow-hidden py-3.5 text-white">
        <div className="flex w-max animate-marquee gap-12 whitespace-nowrap font-display text-lg italic">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k} className="flex gap-12">
              {['Make your mark.', 'Premium paper.', 'Personalise it.', 'For the thinking mind.', 'Gift-ready.', 'Crafted in India.'].map((t) => (
                <span key={t} className="flex items-center gap-12"><span>{t}</span><Spark4 width={14} height={14} className="text-royal-300" /></span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Promotional banner (admin-managed) */}
      {banners.length > 0 && (
        <section className={cn(REVEAL, 'container-suvadu pt-12')}>
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
              ? <Link key={b.id} to={b.link} className="hover-lift block">{Inner}</Link>
              : <div key={b.id}>{Inner}</div>
          })}
        </section>
      )}

      {/* 2. FEATURED COLLECTIONS */}
      <section className="container-suvadu py-16 sm:py-24">
        <SectionHead
          reveal
          eyebrow="Curated for you"
          title="Featured Collections"
          subtitle={`${collections.length || ''} ${collections.length === 1 ? 'world' : 'worlds'} to write in — each with its own voice.`.trim()}
          link={{ to: '/collections', label: 'View all' }}
        />
        {catalogError ? (
          <CatalogRetryNotice />
        ) : loading ? (
          <div className="mt-12"><CollectionGridSkeleton count={6} /></div>
        ) : (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((col, i) => (
            <Link
              key={col.slug}
              to={`/collections/${col.slug}`}
              {...CASCADE}
              className={cn(REVEAL, 'group relative overflow-hidden rounded-3xl border border-border bg-white shadow-card hover-lift hover:shadow-lift')}
            >
              {/* An admin-uploaded cover fills the frame; without one we fall back
                  to the generated notebook on the accent colour. */}
              <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden" style={{ backgroundColor: col.accent }}>
                {col.image ? (
                  <img
                    src={col.image}
                    alt={col.displayName}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                  />
                ) : (
                  <div className="w-28 rotate-[-4deg] transition-transform duration-500 group-hover:rotate-0 group-hover:scale-105">
                    <NotebookCover colour={col.accent} pattern={col.pattern} label={col.displayName} />
                  </div>
                )}
                <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-plum/25 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <span className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1.5 font-body text-[11px] font-medium leading-none tracking-[0.2em] text-royal shadow-card backdrop-blur">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <div className="relative bg-white p-6">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-2xl text-plum">{col.displayName}</h3>
                  <span className="badge-soft shrink-0">{col.count} {col.count === 1 ? 'product' : 'products'}</span>
                </div>
                <p className="mt-2 font-body text-sm font-light leading-relaxed text-muted-foreground">{col.description}</p>
                <span className="mt-5 inline-flex items-center gap-2 font-body text-xs font-medium uppercase tracking-cta text-royal">
                  View Collection
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-lilac text-royal transition-all duration-300 group-hover:bg-royal group-hover:text-white">
                    <ArrowRight width={14} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
        )}
      </section>

      {/* 3. BEST SELLERS — a scalloped page-edge band */}
      <section className="band-wavy relative bg-gradient-to-b from-lilac/80 via-lilac/50 to-lilac/80 py-24 sm:py-32">
        <div aria-hidden className="bg-grain pointer-events-none absolute inset-0 opacity-80" />
        <div className="container-suvadu relative">
          <SectionHead reveal eyebrow="Loved most" title="Best Sellers" subtitle="The notebooks our customers keep coming back for." />
          <div className="mt-12">
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
          <Reveal className="mt-12 text-center">
            <Link to="/collections?filter=bestseller" className="btn-primary btn-lg">Shop Best Sellers</Link>
          </Reveal>
        </div>
      </section>

      {/* 4. OUR STORY — the flying notebook's second stage: it lands here, opens, and writes. */}
      <StorySection />

      {/* Value props */}
      <section className="container-suvadu pb-6 pt-2">
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { Icon: Sparkle, t: 'Premium quality', d: '100 GSM paper, lay-flat binding, soft-touch covers.' },
            { Icon: Pen, t: 'Make it yours', d: 'Add your name, text, font and colour on customised notebooks.' },
            { Icon: Truck, t: 'Pan-India delivery', d: 'Fast, tracked shipping via Shiprocket to your door.' },
          ].map(({ Icon, t, d }) => (
            <div key={t} {...CASCADE} className={cn(REVEAL, 'value-card p-7')}>
              <span className="medallion"><Icon width={22} height={22} /></span>
              <h3 className="mt-5 font-display text-xl text-plum">{t}</h3>
              <p className="mt-2 font-body text-sm font-light leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. CUSTOMER REVIEWS — drifting ribbon, full-bleed, no heading of its own */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-grain opacity-80"
          style={{ background: 'linear-gradient(180deg, rgba(243,232,255,0) 0%, rgba(243,232,255,0.7) 45%, rgba(243,232,255,0) 100%)' }}
        />
        <div className={REVEAL_FADE}>
          <Testimonials reviews={displayReviews} />
        </div>
      </section>

      {/* 6. NEWSLETTER */}
      <section className={cn(REVEAL, 'container-suvadu pb-16 sm:pb-24')}>
        <NewsletterBanner />
      </section>

      {/* 7. INSTAGRAM FEED */}
      <section className="container-suvadu pb-16 sm:pb-24">
        <SectionHead reveal eyebrow="@suvadu.notebooks" title="From the Suvadu journal" link={{ to: 'https://www.instagram.com/suvadu.notebooks/', label: 'Follow us', external: true }} />
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {collections.concat(collections).slice(0, 6).map((c, i) => (
            <a
              key={i}
              href="https://www.instagram.com/suvadu.notebooks/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow @suvadu.notebooks on Instagram"
              {...CASCADE}
              className={cn(REVEAL, 'group relative aspect-square overflow-hidden rounded-2xl')}
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

/** Shown where the flying notebook will land until the 3D chunk arrives — and for good if
 *  the browser has no WebGL. Fades out once the real notebook is drawing. */
function StageFallback() {
  return (
    <div aria-hidden className="flying-notebook-stage__fallback pointer-events-none absolute inset-0 grid place-items-center">
      <div className="w-[48%] max-w-[190px] rotate-[-4deg] drop-shadow-2xl">
        <NotebookCover colour="#4E2675" pattern="mono" label="Make your mark" />
      </div>
    </div>
  )
}

const STORY_CHAPTERS = [
  { n: '01', t: 'Paper you’ll want to write on', d: '100 GSM premium paper and lay-flat binding, so every page stays open for whatever you’re thinking.' },
  { n: '02', t: 'Covers with a soft touch', d: 'Minimal, aesthetic covers in a calm palette — considered enough to carry everywhere.' },
  { n: '03', t: 'Yours, down to the name', d: 'Add your own name, text, font and colour on a customised notebook, and make the first mark yourself.' },
]

/** "Our story". On desktop the notebook is pinned to the middle of the screen,
 *  on a desk that sticks with it, while three chapters scroll past on the left —
 *  so the book has time to land, open, and write out its message. On a phone the
 *  desk is simply a block between the intro and the chapters. */
function StorySection() {
  return (
    <section id="story" className="container-suvadu py-16 sm:py-24">
      <div className="grid gap-x-14 gap-y-10 lg:grid-cols-[0.82fr_1.18fr]">
        <Reveal className="lg:col-start-1 lg:row-start-1">
          <p className="eyebrow mb-4">Our story</p>
          <h2 className="font-display text-3xl leading-[1.08] text-plum sm:text-5xl">
            A notebook is where <span className="italic text-ink">ideas</span> begin.
          </h2>
          <p className="mt-5 max-w-xl font-body text-sm font-light leading-relaxed text-muted-foreground sm:text-base">
            SUVADU began with a simple belief — that the things you write in should feel as considered as the things you write. We obsess over paper weight, cover texture and the quiet joy of a page that lies flat.
          </p>
          <p className="mt-3 max-w-xl font-body text-sm font-light leading-relaxed text-muted-foreground sm:text-base">
            From minimal aesthetics to fully personalised covers, every Suvadu notebook is made to help you make your mark.
          </p>
          <Link to="/about" className="link-underline mt-6 inline-flex items-center gap-1.5 pb-1">
            Read Our Story <ArrowRight width={15} />
          </Link>
        </Reveal>

        {/* The desk column is as tall as the chapters beside it; the notebook pins
            to the middle of it for as long as it lasts. */}
        <div className="relative lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="desk desk-sticky h-[400px] sm:h-[460px]">
            <span aria-hidden className="desk__ring" style={{ width: '58%', aspectRatio: '1' }} />
            <span aria-hidden className="desk__ring" style={{ width: '82%', aspectRatio: '1' }} />
            <span aria-hidden className="desk__ring" style={{ width: '110%', aspectRatio: '1' }} />
            <Spark4 className="twinkle absolute left-[12%] top-[16%] h-5 w-5 text-royal-300" />
            <Spark4 className="twinkle absolute right-[14%] top-[24%] h-3.5 w-3.5 text-royal-400" style={{ animationDelay: '1.6s' }} />
            <Spark4 className="twinkle absolute bottom-[26%] left-[9%] h-3.5 w-3.5 text-royal-400" style={{ animationDelay: '3.1s' }} />
            <Spark4 className="twinkle absolute bottom-[20%] right-[11%] h-5 w-5 text-royal-300" style={{ animationDelay: '0.8s' }} />
            <StageFallback />
            <p className="absolute inset-x-0 bottom-5 text-center font-body text-[11px] font-medium uppercase tracking-[0.2em] text-royal/60">
              Tap the notebook to open or close it
            </p>
          </div>
          <FlyingNotebookStage id="story" open pin fit={0.88} rotY={0} className="absolute inset-0" />
        </div>

        <ol className="space-y-5 lg:col-start-1 lg:row-start-2 lg:space-y-[16vh] lg:pb-[12vh]">
          {STORY_CHAPTERS.map((c) => (
            <li key={c.n} {...CASCADE} className={cn(REVEAL, 'chapter flex items-start gap-5 p-6 sm:gap-7 sm:p-8')}>
              <span className="numeral shrink-0 text-6xl sm:text-7xl">{c.n}</span>
              <div className="min-w-0 pt-1">
                <h3 className="font-display text-2xl text-plum">{c.t}</h3>
                <p className="mt-2 font-body text-sm font-light leading-relaxed text-muted-foreground sm:text-base">{c.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

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

export function SectionHead({ eyebrow, title, subtitle, link, reveal }: {
  eyebrow?: string
  title: string
  subtitle?: string
  link?: { to: string; label: string; external?: boolean }
  /** Rise into view with the section, rather than being painted with it. */
  reveal?: boolean
}) {
  return (
    <div className={cn(reveal && REVEAL, 'flex flex-wrap items-end justify-between gap-x-4 gap-y-3')}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
        <h2 className="font-display text-3xl leading-[1.08] text-plum sm:text-5xl">{title}</h2>
        {subtitle && <p className="mt-4 max-w-xl font-body text-sm font-light text-muted-foreground sm:text-base">{subtitle}</p>}
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

/** Collections peeking out from behind the notebook on the hero disc, labelled
 *  with collections that exist. Falls back to unlabelled covers until the
 *  catalogue lands, rather than inventing names to fill the space. */
function HeroCovers() {
  const { collections } = useCatalog()
  const positions = [
    'absolute -left-3 top-[22%] z-[1] w-32 -rotate-[12deg] xl:w-36',
    'absolute -right-4 top-[9%] z-[1] w-32 rotate-[10deg] xl:w-36',
    'absolute -right-1 bottom-[5%] z-[1] w-28 -rotate-[6deg] xl:w-32',
  ]
  const fallback = [
    { colour: '#E6E6FA', pattern: 'plain' as const },
    { colour: '#FF8DA1', pattern: 'floral' as const },
    { colour: '#36454F', pattern: 'dots' as const },
  ]
  const shown = collections.slice(0, 3)

  return (
    <>
      {positions.map((pos, i) => {
        const col = shown[i]
        const cover = col
          ? <ProductImage image={col.image} alt={col.displayName} colour={col.accent} pattern={col.pattern} label={col.displayName} />
          : <NotebookCover colour={fallback[i].colour} pattern={fallback[i].pattern} />
        // Pale accents (several collections are near-white) vanish against the
        // light hero gradient, so every cover gets an edge of its own.
        const cls = `${pos} overflow-hidden rounded-2xl shadow-lift ring-1 ring-plum/10 transition-transform duration-500 hover:-translate-y-2`
        return col
          ? <Link key={col.slug} to={`/collections/${col.slug}`} className={cls}>{cover}</Link>
          : <div key={i} aria-hidden className={cls}>{cover}</div>
      })}
    </>
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
    <div className="news-banner overflow-hidden rounded-2xl px-5 py-14 text-center text-white shadow-lift sm:rounded-3xl sm:px-12 sm:py-16">
      <Spark4 className="twinkle pointer-events-none absolute left-[8%] top-[18%] h-4 w-4 text-royal-200" />
      <Spark4 className="twinkle pointer-events-none absolute bottom-[22%] right-[9%] h-5 w-5 text-royal-300" style={{ animationDelay: '1.8s' }} />
      <Spark4 className="twinkle pointer-events-none absolute right-[22%] top-[14%] h-3 w-3 text-royal-200" style={{ animationDelay: '3s' }} />
      <div className="relative mx-auto max-w-2xl">
        <p className="font-body text-[11px] font-medium uppercase tracking-[0.18em] text-royal-200 sm:text-xs sm:tracking-[0.24em]">Join the Suvadu circle</p>
        <h2 className="mt-4 font-display text-3xl text-white sm:text-5xl">
          {offer ? `Get ${offer.pct}% off your first notebook` : 'Never miss a new collection'}
        </h2>
        <p className="mt-4 font-body text-sm font-light text-white/70 sm:text-base">Subscribe for new collections, restocks and a little inspiration.</p>
        <NewsletterForm offer={offer} />
      </div>
    </div>
  )
}

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
    <form onSubmit={submit} className="mx-auto mt-8 flex max-w-md flex-col gap-2 rounded-2xl bg-white p-2 shadow-lift xs:flex-row xs:gap-0 xs:rounded-full xs:p-1.5">
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
