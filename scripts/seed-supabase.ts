/**
 * One-time seed: pushes the static catalogue (collections + products) into
 * Supabase so the live store reads from the DB instead of localStorage.
 *
 * The catalogue is imported from src/data/products.ts — the single source of
 * truth — so this never drifts from what the app used to render.
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<your service_role key>"; npm run seed:supabase
 * Usage (bash):
 *   SUPABASE_SERVICE_ROLE_KEY="<your service_role key>" npm run seed:supabase
 *
 * The service_role key BYPASSES Row-Level Security (needed to write the seed).
 * Keep it secret — never commit it or ship it to the client.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import {
  ALL_PRODUCTS,
  COLLECTIONS,
  SPECIAL_COLLECTIONS,
  type Product,
} from '../src/data/products'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Read VITE_SUPABASE_URL from .env.local so the user only supplies the key.
function readEnvLocal(key: string): string | undefined {
  try {
    const raw = readFileSync(resolve(__dirname, '..', '.env.local'), 'utf8')
    const line = raw.split('\n').find((l) => l.trim().startsWith(`${key}=`))
    return line?.split('=').slice(1).join('=').trim()
  } catch {
    return undefined
  }
}

// Strip stray wrapping quotes / angle brackets / whitespace — a common
// copy-paste slip that otherwise surfaces as a confusing "Invalid API key".
function clean(v: string | undefined): string | undefined {
  return v?.trim().replace(/^['"<]+/, '').replace(/['">]+$/, '').trim()
}

const SUPABASE_URL = clean(process.env.SUPABASE_URL) || readEnvLocal('VITE_SUPABASE_URL')
const SERVICE_KEY = clean(process.env.SUPABASE_SERVICE_ROLE_KEY)

if (!SUPABASE_URL) {
  console.error('✗ Missing Supabase URL. Set SUPABASE_URL or VITE_SUPABASE_URL in .env.local.')
  process.exit(1)
}
if (!SERVICE_KEY) {
  console.error('✗ Missing SUPABASE_SERVICE_ROLE_KEY. Get it from Supabase → Settings → API.')
  console.error('  PowerShell:  $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."; npm run seed:supabase')
  process.exit(1)
}
// The service_role JWT carries "role":"service_role"; the anon key carries
// "role":"anon". Catch the easy mix-up before we hit an opaque auth error.
try {
  const role = JSON.parse(Buffer.from(SERVICE_KEY.split('.')[1] ?? '', 'base64').toString()).role
  if (role && role !== 'service_role') {
    console.error(`✗ That looks like the "${role}" key, not the service_role key. Seeding needs service_role (it bypasses RLS).`)
    process.exit(1)
  }
} catch {
  /* not a JWT we can read — let the API reject it with its own message */
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

const collectionRows = [
  ...COLLECTIONS.map((c, i) => ({
    slug: c.slug,
    display_name: c.displayName,
    internal_name: c.internalName,
    description: c.description,
    accent: c.accent,
    pattern: c.pattern,
    sort_order: i,
    is_special: false,
  })),
  ...SPECIAL_COLLECTIONS.map((s, i) => ({
    slug: s.slug,
    display_name: s.displayName,
    internal_name: s.type,
    description: s.details,
    accent: '#E6E6FA',
    pattern: 'plain',
    sort_order: 100 + i,
    is_special: true,
  })),
]

const productRows = ALL_PRODUCTS.map((p: Product) => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  type: p.type,
  collection_slug: p.collectionSlug,
  price_a5: p.prices.A5,
  price_a4: p.prices.A4,
  price_custom: p.prices.Custom,
  custom_price_on_request: Boolean(p.customPriceOnRequest),
  description: p.description,
  specs: p.specs,
  colour_name: p.colour.name,
  colour_hex: p.colour.hex,
  pattern: p.pattern,
  image: p.image ?? null,
  rating: p.rating,
  reviews: p.reviews,
  bestseller: Boolean(p.bestseller),
  is_new: Boolean(p.isNew),
  is_custom: false,
}))

async function main() {
  console.log(`Seeding ${collectionRows.length} collections…`)
  const { error: cErr } = await supabase
    .from('collections')
    .upsert(collectionRows, { onConflict: 'slug' })
  if (cErr) throw cErr

  console.log(`Seeding ${productRows.length} products…`)
  const { error: pErr } = await supabase
    .from('products')
    .upsert(productRows, { onConflict: 'id' })
  if (pErr) throw pErr

  console.log('✓ Seed complete.')
}

main().catch((err) => {
  console.error('✗ Seed failed:', err.message ?? err)
  // Set exitCode instead of process.exit() so pending network handles close
  // cleanly — a hard exit mid-request crashes libuv on Windows (async.c assert).
  process.exitCode = 1
})
