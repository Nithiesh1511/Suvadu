import { Link } from 'react-router-dom'
import { ChevronRight } from './Icons'
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
    <section className="gradient-hero border-b border-border">
      {breadcrumbLd && <JsonLd data={breadcrumbLd} />}
      <div className={cn('container-suvadu', bare ? 'py-4' : 'py-10 sm:py-16')}>
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
