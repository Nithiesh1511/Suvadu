import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  COLOURS,
  type Collection,
  type ColourOption,
  type Pattern,
  type Product,
  type ProductType,
} from '@/data/products'
import { supabase, type CollectionRow, type ColourRow, type ProductRow } from '@/lib/supabase'
import { logAdmin } from '@/lib/adminLog'
import { aggregateReviewStats, type ReviewStat, type ReviewStatRow } from '@/lib/reviewStats'

// ── Catalogue layer (Supabase-backed) ───────────────────────────────────────
// Collections + products are read from the database, so admin-added products
// are visible to every visitor (not just the browser that created them, as in
// the old localStorage prototype). Admin writes go straight to the `products`
// table; product cover images go to the `product-images` Storage bucket.

const BUCKET = 'product-images'

export interface ProductInput {
  name: string
  collectionSlug: string
  type: ProductType
  priceA5: number
  priceA4: number | null
  priceCustom: number | null
  description: string
  image: string // data URL (admin picker), an existing URL, or '' for none
  bestseller: boolean
  isNew: boolean
  stock: number | null // null = not tracked / unlimited
}

export interface CollectionInput {
  displayName: string
  internalName?: string
  description: string
  accent: string
  pattern: Pattern
  /** data URL from the admin picker, an existing URL, or '' to clear it. */
  image?: string
}

type Result = { ok: boolean; message: string }

interface CatalogState {
  loading: boolean
  error: string | null
  products: Product[] // shoppable grid catalogue (main collections only)
  allProducts: Product[] // everything (search / slug lookup)
  collections: Collection[] // main collections with live counts
  colours: ColourOption[] // active colour options (admin-managed, falls back to static)
  customProducts: Product[] // admin-added only (for the admin list)
  getProductBySlug: (slug: string) => Product | undefined
  getProductsByCollection: (slug: string) => Product[]
  getBestSellers: () => Product[]
  addProduct: (input: ProductInput) => Promise<{ ok: boolean; message: string; product?: Product }>
  updateProduct: (id: string, input: ProductInput) => Promise<Result>
  deleteProduct: (id: string) => Promise<boolean>
  addCollection: (input: CollectionInput) => Promise<Result>
  updateCollection: (slug: string, input: CollectionInput) => Promise<Result>
  refresh: () => Promise<void>
}

const CatalogContext = createContext<CatalogState | null>(null)

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function mapCollection(r: CollectionRow, count: number): Collection {
  return {
    slug: r.slug,
    displayName: r.display_name,
    internalName: r.internal_name,
    description: r.description,
    count,
    accent: r.accent,
    pattern: r.pattern as Pattern,
    image: r.image_url ?? undefined,
  }
}

function mapProduct(r: ProductRow, collectionName: string, stat: ReviewStat | undefined): Product {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    type: r.type as ProductType,
    collectionSlug: r.collection_slug,
    collectionName,
    prices: {
      A5: Number(r.price_a5),
      A4: r.price_a4 == null ? null : Number(r.price_a4),
      Custom: r.price_custom == null ? null : Number(r.price_custom),
    },
    customPriceOnRequest: r.custom_price_on_request,
    description: r.description,
    specs: r.specs ?? [],
    colour: { name: r.colour_name, hex: r.colour_hex },
    pattern: r.pattern as Pattern,
    image: r.image ?? undefined,
    // Ratings come from approved reviews, never from the seeded
    // products.rating / products.reviews columns. Those still hold the launch
    // placeholder values (4.9 / 212 reviews), which is why product pages used
    // to advertise a rating directly above "No reviews yet".
    rating: stat?.average ?? 0,
    reviews: stat?.count ?? 0,
    bestseller: r.bestseller,
    isNew: r.is_new,
    stock: r.stock ?? null,
  }
}

/** Uploads a data URL into the public bucket and returns its public URL. */
async function uploadImage(name: string, dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob()
  const ext = (blob.type.split('/')[1] || 'png').split('+')[0]
  const path = `${name}.${ext}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true, contentType: blob.type })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

const uploadProductImage = (id: string, dataUrl: string) => uploadImage(id, dataUrl)
const uploadCollectionImage = (slug: string, dataUrl: string) => uploadImage(`collection-${slug}`, dataUrl)

/** Shared by add/updateCollection. Unlike product covers, collection covers are
 *  kept inline as a base64 data URL in `collections.image_url` — no Storage
 *  object. Keeping them inline meant every visitor downloaded the base64 —
 *  ~385 KB for a single cover — inside the collections response, before any
 *  collection could render, on every page that loads the catalogue, with no
 *  caching and no way to resize it. They go to the same Storage bucket as
 *  product covers now, so the row carries a URL.
 *  An existing http URL (seeded rows) is kept as-is; '' clears the image. */
async function resolveCollectionImage(slug: string, image: string | undefined): Promise<string | null> {
  if (!image) return null
  if (image.startsWith('data:')) return uploadCollectionImage(slug, image)
  return image.trim() || null
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [collectionRows, setCollectionRows] = useState<CollectionRow[]>([])
  const [productRows, setProductRows] = useState<ProductRow[]>([])
  const [colourRows, setColourRows] = useState<ColourRow[]>([])
  const [reviewStats, setReviewStats] = useState<Map<string, ReviewStat>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cols, prods, cls, revs] = await Promise.all([
        supabase.from('collections').select('*').order('sort_order', { ascending: true }),
        supabase.from('products').select('*').order('created_at', { ascending: true }),
        supabase.from('colours').select('*').order('sort_order', { ascending: true }),
        // One query for the whole catalogue's ratings — aggregated below rather
        // than one request per card.
        supabase.from('reviews').select('product_id, rating').eq('status', 'approved'),
      ])
      if (cols.error || prods.error) {
        setError((cols.error ?? prods.error)?.message ?? 'Failed to load catalogue.')
        return
      }
      setCollectionRows((cols.data as CollectionRow[]) ?? [])
      setProductRows((prods.data as ProductRow[]) ?? [])
      setColourRows((cls.data as ColourRow[]) ?? [])

      // A ratings failure must not blank the catalogue — fall back to "no reviews".
      setReviewStats(aggregateReviewStats((revs.data ?? []) as ReviewStatRow[]))
    } catch (e) {
      // A rejected request — offline, DNS failure, CORS — never produces an
      // error object to inspect. Without this the promise rejects, `loading` is
      // never cleared, and every page sits on "Loading…" for good.
      setError((e as Error)?.message || 'Could not reach the shop.')
    } finally {
      // Always: a stuck spinner is worse than an honest failure.
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const collectionNameBySlug = useMemo(() => {
    const m = new Map<string, string>()
    collectionRows.forEach((c) => m.set(c.slug, c.display_name))
    return m
  }, [collectionRows])

  const mainSlugs = useMemo(
    () => new Set(collectionRows.filter((c) => !c.is_special).map((c) => c.slug)),
    [collectionRows],
  )

  const allProducts = useMemo<Product[]>(
    () =>
      productRows.map((r) =>
        mapProduct(r, collectionNameBySlug.get(r.collection_slug) ?? r.collection_slug, reviewStats.get(r.id)),
      ),
    [productRows, collectionNameBySlug, reviewStats],
  )

  const products = useMemo<Product[]>(
    () => allProducts.filter((p) => mainSlugs.has(p.collectionSlug)),
    [allProducts, mainSlugs],
  )

  const customProducts = useMemo<Product[]>(() => {
    const ids = new Set(productRows.filter((r) => r.is_custom).map((r) => r.id))
    return allProducts.filter((p) => ids.has(p.id))
  }, [allProducts, productRows])

  const collections = useMemo<Collection[]>(
    () =>
      collectionRows
        .filter((c) => !c.is_special)
        .map((c) => mapCollection(c, products.filter((p) => p.collectionSlug === c.slug).length)),
    [collectionRows, products],
  )

  // Active colours from the DB; fall back to the static list if none loaded.
  const colours = useMemo<ColourOption[]>(
    () => (colourRows.length ? colourRows.filter((c) => c.active).map((c) => ({ name: c.name, hex: c.hex })) : COLOURS),
    [colourRows],
  )

  const getProductBySlug = useCallback(
    (slug: string) => allProducts.find((p) => p.slug === slug),
    [allProducts],
  )
  const getProductsByCollection = useCallback(
    (slug: string) => products.filter((p) => p.collectionSlug === slug),
    [products],
  )
  const getBestSellers = useCallback(
    () => allProducts.filter((p) => p.bestseller).slice(0, 4),
    [allProducts],
  )

  const addProduct = useCallback(
    async (input: ProductInput): Promise<{ ok: boolean; message: string; product?: Product }> => {
      const name = input.name.trim()
      if (!name) return { ok: false, message: 'Product name is required.' }
      const collection = collectionRows.find((c) => c.slug === input.collectionSlug && !c.is_special)
      if (!collection) return { ok: false, message: 'Pick a valid collection.' }
      if (!input.priceA5 || input.priceA5 <= 0) return { ok: false, message: 'Enter a valid A5 price.' }

      // Unique slug across the whole catalogue.
      const base = slugify(name) || 'product'
      const existing = new Set(productRows.map((r) => r.slug))
      let slug = base
      let n = 2
      while (existing.has(slug)) slug = `${base}-${n++}`

      const id = `PA-${Date.now()}`

      let imageUrl: string | null = null
      try {
        if (input.image && input.image.startsWith('data:')) {
          imageUrl = await uploadProductImage(id, input.image)
        } else if (input.image.trim()) {
          imageUrl = input.image.trim()
        }
      } catch (e) {
        return { ok: false, message: `Image upload failed: ${(e as Error).message}` }
      }

      const row = {
        id,
        slug,
        name,
        type: input.type,
        collection_slug: collection.slug,
        price_a5: input.priceA5,
        price_a4: input.priceA4,
        price_custom: input.priceCustom ?? null,
        custom_price_on_request: input.type === 'customized' && input.priceCustom == null,
        description: input.description.trim() || `${name} — part of the ${collection.display_name}.`,
        specs: ['100 GSM premium paper', '160 pages', 'Lay-flat binding'],
        colour_name: COLOURS[0].name,
        colour_hex: COLOURS[0].hex,
        pattern: collection.pattern,
        image: imageUrl,
        // Ratings are derived from approved reviews; never seed one.
        rating: 0,
        reviews: 0,
        bestseller: input.bestseller,
        is_new: input.isNew,
        stock: input.stock,
        is_custom: true,
      }

      const { data, error: insErr } = await supabase.from('products').insert(row).select().single()
      if (insErr) {
        return {
          ok: false,
          message: insErr.message.includes('row-level security')
            ? 'You need admin access to add products.'
            : insErr.message,
        }
      }
      setProductRows((prev) => [...prev, data as ProductRow])
      logAdmin('product.create', (data as ProductRow).id, { name, price_a5: input.priceA5 })
      return {
        ok: true,
        message: `“${name}” added to ${collection.display_name}.`,
        // Brand new — it cannot have reviews yet.
        product: mapProduct(data as ProductRow, collection.display_name, undefined),
      }
    },
    [collectionRows, productRows],
  )

  const updateProduct = useCallback(
    async (id: string, input: ProductInput): Promise<Result> => {
      const name = input.name.trim()
      if (!name) return { ok: false, message: 'Product name is required.' }
      const collection = collectionRows.find((c) => c.slug === input.collectionSlug)
      if (!collection) return { ok: false, message: 'Pick a valid collection.' }
      if (!input.priceA5 || input.priceA5 <= 0) return { ok: false, message: 'Enter a valid A5 price.' }

      let imageUrl: string | null = input.image || null
      try {
        if (input.image && input.image.startsWith('data:')) imageUrl = await uploadProductImage(id, input.image)
      } catch (e) {
        return { ok: false, message: `Image upload failed: ${(e as Error).message}` }
      }

      const patch = {
        name,
        type: input.type,
        collection_slug: collection.slug,
        price_a5: input.priceA5,
        price_a4: input.priceA4,
        price_custom: input.priceCustom ?? null,
        custom_price_on_request: input.type === 'customized' && input.priceCustom == null,
        description: input.description.trim(),
        image: imageUrl,
        bestseller: input.bestseller,
        is_new: input.isNew,
        stock: input.stock,
      }
      const { data, error: updErr } = await supabase.from('products').update(patch).eq('id', id).select().single()
      if (updErr) {
        return {
          ok: false,
          message: updErr.message.includes('row-level security') ? 'You need admin access to edit products.' : updErr.message,
        }
      }
      setProductRows((prev) => prev.map((r) => (r.id === id ? (data as ProductRow) : r)))
      logAdmin('product.update', id, { name, price_a5: input.priceA5, price_a4: input.priceA4 })
      return { ok: true, message: `“${name}” updated.` }
    },
    [collectionRows],
  )

  const deleteProduct = useCallback(async (id: string): Promise<boolean> => {
    const { error: delErr } = await supabase.from('products').delete().eq('id', id)
    if (delErr) return false
    setProductRows((prev) => prev.filter((r) => r.id !== id))
    logAdmin('product.delete', id)
    return true
  }, [])

  const addCollection = useCallback(
    async (input: CollectionInput): Promise<Result> => {
      const name = input.displayName.trim()
      if (!name) return { ok: false, message: 'Collection name is required.' }
      const base = slugify(name) || 'collection'
      const existing = new Set(collectionRows.map((c) => c.slug))
      let slug = base
      let n = 2
      while (existing.has(slug)) slug = `${base}-${n++}`

      // Uploading can fail (bucket missing, offline) — report it the way the
      // product form does rather than rejecting out of the admin's click handler.
      let imageUrl: string | null
      try {
        imageUrl = await resolveCollectionImage(slug, input.image)
      } catch (e) {
        return { ok: false, message: `Image upload failed: ${(e as Error).message}` }
      }

      const row = {
        slug,
        display_name: name,
        internal_name: input.internalName?.trim() || name,
        description: input.description.trim(),
        accent: input.accent,
        pattern: input.pattern,
        sort_order: collectionRows.length,
        is_special: false,
        image_url: imageUrl,
      }
      const { data, error } = await supabase.from('collections').insert(row).select().single()
      if (error) {
        return { ok: false, message: error.message.includes('row-level security') ? 'You need admin access.' : error.message }
      }
      setCollectionRows((prev) => [...prev, data as CollectionRow])
      logAdmin('collection.create', (data as CollectionRow).slug, { name })
      return { ok: true, message: `Collection “${name}” created.` }
    },
    [collectionRows],
  )

  const updateCollection = useCallback(async (slug: string, input: CollectionInput): Promise<Result> => {
    const name = input.displayName.trim()
    if (!name) return { ok: false, message: 'Collection name is required.' }

    let imageUrl: string | null
    try {
      imageUrl = await resolveCollectionImage(slug, input.image)
    } catch (e) {
      return { ok: false, message: `Image upload failed: ${(e as Error).message}` }
    }

    const patch = {
      display_name: name,
      internal_name: input.internalName?.trim() || name,
      description: input.description.trim(),
      accent: input.accent,
      pattern: input.pattern,
      image_url: imageUrl,
    }
    const { data, error } = await supabase.from('collections').update(patch).eq('slug', slug).select().single()
    if (error) {
      return { ok: false, message: error.message.includes('row-level security') ? 'You need admin access.' : error.message }
    }
    setCollectionRows((prev) => prev.map((c) => (c.slug === slug ? (data as CollectionRow) : c)))
    logAdmin('collection.update', slug, { name })
    return { ok: true, message: `Collection “${name}” updated.` }
  }, [])

  const value: CatalogState = {
    loading,
    error,
    products,
    allProducts,
    collections,
    colours,
    customProducts,
    getProductBySlug,
    getProductsByCollection,
    getBestSellers,
    addProduct,
    updateProduct,
    deleteProduct,
    addCollection,
    updateCollection,
    refresh,
  }

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog(): CatalogState {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider')
  return ctx
}
