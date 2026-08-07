import { Link } from 'react-router-dom'
import { REVIEWS, COLOURS } from '@/data/products'
import { useCatalog } from '@/context/CatalogContext'
import ProductCard from '@/components/ProductCard'
import NotebookCover from '@/components/NotebookCover'
import Stars from '@/components/Stars'
import { ArrowRight, Truck, Leaf, Sparkle, Pen, Instagram } from '@/components/Icons'

export default function Home() {
  const { collections, getBestSellers } = useCatalog()
  const featured = collections.slice(0, 6)
  const bestSellers = getBestSellers()

  return (
    <div>
      {/* 1. HERO BANNER */}
      <section className="gradient-hero relative overflow-hidden bg-grain">
        <div className="container-suvadu grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-up">
            <p className="eyebrow mb-5">Premium notebooks · Pan-India</p>
            <h1 className="text-balance font-display text-5xl leading-[1.05] text-plum sm:text-6xl lg:text-7xl">
              Make your <span className="italic text-royal">mark.</span>
            </h1>
            <p className="mt-6 max-w-md font-body text-lg font-light leading-relaxed text-muted-foreground">
              Minimal, aesthetic notebooks crafted for the thinking mind. Premium paper, considered covers, and the option to make every page unmistakably yours.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/collections" className="btn-primary btn-lg">Shop Now</Link>
              <Link to="/collections" className="btn-secondary btn-lg">Explore Collections</Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 font-body text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><Truck width={18} className="text-royal" /> Free shipping over ₹499</span>
              <span className="flex items-center gap-2"><Pen width={18} className="text-royal" /> Personalisation available</span>
              <span className="flex items-center gap-2"><Leaf width={18} className="text-royal" /> Premium 100 GSM paper</span>
            </div>
          </div>

          {/* Hero visual — fanned notebooks */}
          <div className="relative hidden h-[440px] lg:block">
            <div className="absolute left-[6%] top-10 w-48 -rotate-[10deg] shadow-lift transition-transform duration-500 hover:-translate-y-2">
              <NotebookCover colour="#E6E6FA" pattern="plain" label="Calm Collection" />
            </div>
            <div className="absolute left-[34%] top-0 z-10 w-52 rotate-[3deg] shadow-lift transition-transform duration-500 hover:-translate-y-2">
              <NotebookCover colour="#613092" pattern="mono" label="Inspire Ink" />
            </div>
            <div className="absolute right-[4%] top-14 w-48 rotate-[11deg] shadow-lift transition-transform duration-500 hover:-translate-y-2">
              <NotebookCover colour="#FF8DA1" pattern="floral" label="Her Journal" />
            </div>
            <div className="absolute bottom-2 left-[26%] z-20 w-44 -rotate-[3deg] shadow-lift transition-transform duration-500 hover:-translate-y-2">
              <NotebookCover colour="#36454F" pattern="dots" label="Midnight" />
            </div>
          </div>
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

      {/* 2. FEATURED COLLECTIONS */}
      <section className="container-suvadu py-20">
        <SectionHead
          eyebrow="Curated for you"
          title="Featured Collections"
          subtitle="Seven worlds to write in — each with its own voice."
          link={{ to: '/collections', label: 'View all' }}
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((col) => (
            <Link
              key={col.slug}
              to={`/collections/${col.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-border shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
            >
              <div className="flex aspect-[16/10] items-center justify-center" style={{ backgroundColor: col.accent }}>
                <div className="w-28 rotate-[-4deg] transition-transform duration-500 group-hover:rotate-0 group-hover:scale-105">
                  <NotebookCover colour={col.accent} pattern={col.pattern} label={col.displayName} />
                </div>
              </div>
              <div className="bg-white p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-2xl text-plum">{col.displayName}</h3>
                  <span className="badge-soft">{col.count} designs</span>
                </div>
                <p className="mt-2 font-body text-sm font-light leading-relaxed text-muted-foreground">{col.description}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 font-body text-xs font-medium uppercase tracking-cta text-royal">
                  View Collection <ArrowRight width={15} className="transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. BEST SELLERS */}
      <section className="bg-lilac/40 py-20">
        <div className="container-suvadu">
          <SectionHead eyebrow="Loved most" title="Best Sellers" subtitle="The notebooks our customers keep coming back for." />
          <div className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {bestSellers.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          <div className="mt-10 text-center">
            <Link to="/collections?filter=bestseller" className="btn-primary btn-lg">Shop Best Sellers</Link>
          </div>
        </div>
      </section>

      {/* 4. ABOUT SUVADU (short) */}
      <section className="container-suvadu py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="order-2 grid grid-cols-3 gap-3 lg:order-1">
            {COLOURS.slice(0, 9).map((c) => (
              <div key={c.name} className="aspect-square rounded-xl border border-border shadow-card" style={{ backgroundColor: c.hex }} title={c.name} />
            ))}
          </div>
          <div className="order-1 lg:order-2">
            <p className="eyebrow mb-4">Our story</p>
            <h2 className="font-display text-4xl leading-tight text-plum">A notebook is where ideas begin.</h2>
            <p className="mt-5 font-body text-base font-light leading-relaxed text-muted-foreground">
              SUVADU began with a simple belief — that the things you write in should feel as considered as the things you write. We obsess over paper weight, cover texture and the quiet joy of a page that lies flat.
            </p>
            <p className="mt-4 font-body text-base font-light leading-relaxed text-muted-foreground">
              From minimal aesthetics to fully personalised covers, every Suvadu notebook is made to help you make your mark.
            </p>
            <Link to="/about" className="link-underline mt-6 inline-flex items-center gap-1.5">
              Read Our Story <ArrowRight width={16} />
            </Link>
          </div>
        </div>
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

      {/* 5. CUSTOMER REVIEWS */}
      <section className="container-suvadu py-20">
        <SectionHead eyebrow="Kind words" title="Loved by writers across India" />
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {REVIEWS.map((r) => (
            <figure key={r.name} className="card-surface flex flex-col p-6">
              <Stars rating={r.rating} />
              <blockquote className="mt-4 flex-1 font-body text-sm font-light leading-relaxed text-plum/90">“{r.text}”</blockquote>
              <figcaption className="mt-5 border-t border-border pt-4">
                <span className="block font-display text-base text-plum">{r.name}</span>
                <span className="block font-body text-xs text-muted-foreground">{r.location}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* 6. NEWSLETTER */}
      <section className="container-suvadu pb-20">
        <NewsletterBanner />
      </section>

      {/* 7. INSTAGRAM FEED */}
      <section className="container-suvadu pb-20">
        <SectionHead eyebrow="@suvadu.notebooks" title="From the Suvadu journal" link={{ to: 'https://instagram.com', label: 'Follow us', external: true }} />
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {collections.concat(collections).slice(0, 6).map((c, i) => (
            <a
              key={i}
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
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

export function SectionHead({ eyebrow, title, subtitle, link }: {
  eyebrow?: string
  title: string
  subtitle?: string
  link?: { to: string; label: string; external?: boolean }
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h2 className="font-display text-3xl leading-tight text-plum sm:text-4xl">{title}</h2>
        {subtitle && <p className="mt-3 max-w-xl font-body text-base font-light text-muted-foreground">{subtitle}</p>}
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

function NewsletterBanner() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-plum px-6 py-14 text-center text-white sm:px-12">
      <div className="pointer-events-none absolute inset-0 opacity-30 bg-grain" />
      <div className="relative mx-auto max-w-2xl">
        <p className="font-body text-xs font-medium uppercase tracking-[0.24em] text-royal-200">Join the Suvadu circle</p>
        <h2 className="mt-4 font-display text-3xl text-white sm:text-4xl">Get 10% off your first notebook</h2>
        <p className="mt-3 font-body text-sm font-light text-white/70">Subscribe for new collections, restocks and a little inspiration.</p>
        <NewsletterForm />
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useToast } from '@/components/Toast'
function NewsletterForm() {
  const { notify } = useToast()
  const [email, setEmail] = useState('')
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (email.trim()) { notify('Subscribed — welcome to Suvadu!'); setEmail('') } }}
      className="mx-auto mt-7 flex max-w-md overflow-hidden rounded-full bg-white p-1.5"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        className="w-full bg-transparent px-5 font-body text-sm text-plum outline-none placeholder:text-muted-foreground/60"
      />
      <button type="submit" className="btn-primary shrink-0">Subscribe</button>
    </form>
  )
}
