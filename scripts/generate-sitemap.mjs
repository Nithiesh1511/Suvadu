// Generates public/sitemap.xml (brief §11 — auto-generated XML sitemap).
// Run with: npm run gen:sitemap (also runs as part of `npm run build`).
//
// Pulls the LIVE catalogue (collections + products) from Supabase so admin-added
// products are included and the list never drifts out of sync. Falls back to the
// static pages only if Supabase env vars aren't available at build time.
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT = resolve(ROOT, 'public', 'sitemap.xml')

// Minimal .env loader (Vite doesn't expose these to a plain node script).
function loadEnv(file) {
  const path = resolve(ROOT, file)
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv('.env.local')
loadEnv('.env')

const ORIGIN = (process.env.VITE_SITE_URL || 'https://suvadu.example.com').replace(/\/$/, '')
const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY

// Public, indexable static pages (transactional routes excluded — see robots.txt).
const STATIC = [
  '/', '/collections', '/special-collections', '/accessories',
  '/about', '/faq',
  '/privacy-policy', '/terms', '/shipping-policy', '/refund-policy',
]

async function fetchRows(table, select) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${table}?select=${select}`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
  })
  if (!res.ok) throw new Error(`${table}: ${res.status}`)
  return res.json()
}

const urls = new Set(STATIC)

if (SUPA_URL && SUPA_KEY) {
  try {
    const [collections, products] = await Promise.all([
      fetchRows('collections', 'slug,is_special'),
      fetchRows('products', 'slug'),
    ])
    for (const c of collections) {
      urls.add(c.is_special ? `/special-collections/${c.slug}` : `/collections/${c.slug}`)
    }
    for (const p of products) urls.add(`/products/${p.slug}`)
    console.log(`Fetched ${collections.length} collections + ${products.length} products from Supabase.`)
  } catch (e) {
    console.warn(`⚠️  Could not fetch catalogue (${e.message}); writing static pages only.`)
  }
} else {
  console.warn('⚠️  VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set; writing static pages only.')
}

const body = [...urls]
  .map((u) => `  <url>\n    <loc>${ORIGIN}${u}</loc>\n    <changefreq>weekly</changefreq>\n  </url>`)
  .join('\n')

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, xml)
console.log(`Wrote ${urls.size} URLs to ${OUT} (origin: ${ORIGIN})`)
