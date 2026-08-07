// Generates public/sitemap.xml (brief §11 — auto-generated XML sitemap).
// Run with: npm run gen:sitemap
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ORIGIN = 'https://suvadu.example.com'
const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', 'public', 'sitemap.xml')

// Mirror of the catalogue in src/data/products.ts (slug + design count).
const COLLECTIONS = [
  { slug: 'calm-collection', count: 5 },
  { slug: 'inspire-ink', count: 4 },
  { slug: 'nature-notes', count: 5 },
  { slug: 'rhythm-series', count: 5 },
  { slug: 'midnight-collection', count: 3 },
  { slug: 'her-journal', count: 5 },
  { slug: 'tiny-tales', count: 4 },
]
const SPECIAL = ['match-and-write', 'made-for-you', 'create-and-carry']
const SPECIAL_PRODUCTS = ['customized-notebook', 'matching-set']

// Public, indexable static pages (transactional routes excluded — see robots.txt).
const STATIC = [
  '/', '/collections', '/special-collections', '/accessories',
  '/about', '/contact', '/faq',
  '/privacy-policy', '/terms', '/shipping-policy', '/refund-policy',
]

const urls = new Set(STATIC)
for (const c of COLLECTIONS) {
  urls.add(`/collections/${c.slug}`)
  for (let i = 1; i <= c.count; i++) urls.add(`/products/${c.slug}-${i}`)
}
for (const s of SPECIAL) urls.add(`/special-collections/${s}`)
for (const p of SPECIAL_PRODUCTS) urls.add(`/products/${p}`)

const body = [...urls]
  .map((u) => `  <url>\n    <loc>${ORIGIN}${u}</loc>\n    <changefreq>weekly</changefreq>\n  </url>`)
  .join('\n')

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, xml)
console.log(`Wrote ${urls.size} URLs to ${OUT}`)
