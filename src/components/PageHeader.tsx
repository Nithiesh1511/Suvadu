import { Link } from 'react-router-dom'
import { ChevronRight, Spark4 } from './Icons'
import JsonLd from './JsonLd'
import { cn } from '@/lib/utils'

interface Crumb { label: string; to?: string }

const ORIGIN = 'https://suvadu.example.com'

export default function PageHeader({ title, subtitle, eyebrow, crumbs }: {
  /** Omit on pages that render their own <h1> (e.g. a product page) — the
      header then collapses to a slim breadcrumb bar instead of reserving a
      hero-sized band around an empty heading. */
  title?: string
  subtitle?: string
  eyebrow?: string
  crumbs?: Crumb[]
}) {
  const bare = !title && !subtitle && !eyebrow
  // BreadcrumbList structured data (brief §11) — built from the same crumbs.
  const breadcrumbLd = crumbs && crumbs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ label: 'Home', to: '/' }, ...crumbs].map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      ...(c.to ? { item: `${ORIGIN}${c.to}` } : {}),
    })),
  } : null

  return (
    <section className="gradient-hero relative overflow-hidden border-b border-border">
      {breadcrumbLd && <JsonLd data={breadcrumbLd} />}
      {/* Ruled paper, a pair of rings and a sparkle — the same hand as the home hero.
          Skipped on the slim breadcrumb-only variant, which has no room for them. */}
      {!bare && (
        <>
          <div aria-hidden className="paper-rules pointer-events-none absolute inset-0 opacity-60" />
          <span aria-hidden className="pointer-events-none absolute -right-28 -top-32 h-80 w-80 rounded-full border border-royal/10" />
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-14 h-52 w-52 rounded-full border border-dashed border-royal/20" />
          <Spark4 className="twinkle pointer-events-none absolute right-[16%] top-[30%] hidden h-4 w-4 text-royal-300 sm:block" />
          <Spark4 className="twinkle pointer-events-none absolute right-[8%] bottom-[22%] hidden h-3 w-3 text-royal-400 sm:block" style={{ animationDelay: '1.6s' }} />
        </>
      )}
      <div className={cn('container-suvadu relative', bare ? 'py-4' : 'py-10 sm:py-16')}>
        {crumbs && crumbs.length > 0 && (
          <nav className={cn('flex flex-wrap items-center gap-x-1.5 gap-y-1 font-body text-xs text-muted-foreground', !bare && 'mb-5')} aria-label="Breadcrumb">
            <Link to="/" className="hover:text-royal">Home</Link>
            {crumbs.map((c, i) => (
              <span key={i} className="flex min-w-0 items-center gap-1.5">
                <ChevronRight width={13} height={13} className="shrink-0 text-muted-foreground/60" />
                {c.to ? <Link to={c.to} className="hover:text-royal">{c.label}</Link> : <span className="truncate text-plum">{c.label}</span>}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        {title && <h1 className="max-w-3xl text-balance font-display text-3xl leading-tight text-plum sm:text-4xl lg:text-5xl">{title}</h1>}
        {subtitle && <p className="mt-4 max-w-2xl font-body text-sm font-light leading-relaxed text-muted-foreground sm:text-base">{subtitle}</p>}
      </div>
    </section>
  )
}
