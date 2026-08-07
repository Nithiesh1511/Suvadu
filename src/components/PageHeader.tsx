import { Link } from 'react-router-dom'
import { ChevronRight } from './Icons'
import JsonLd from './JsonLd'

interface Crumb { label: string; to?: string }

const ORIGIN = 'https://suvadu.example.com'

export default function PageHeader({ title, subtitle, eyebrow, crumbs }: {
  title: string
  subtitle?: string
  eyebrow?: string
  crumbs?: Crumb[]
}) {
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
      <div className="container-suvadu py-12 sm:py-16">
        {crumbs && crumbs.length > 0 && (
          <nav className="mb-5 flex items-center gap-1.5 font-body text-xs text-muted-foreground" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-royal">Home</Link>
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <ChevronRight width={13} height={13} className="text-muted-foreground/60" />
                {c.to ? <Link to={c.to} className="hover:text-royal">{c.label}</Link> : <span className="text-plum">{c.label}</span>}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="max-w-3xl text-balance font-display text-4xl leading-tight text-plum sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-4 max-w-2xl font-body text-base font-light leading-relaxed text-muted-foreground">{subtitle}</p>}
      </div>
    </section>
  )
}
