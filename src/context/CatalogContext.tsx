import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  PRODUCTS,
  ALL_PRODUCTS,
  COLLECTIONS,
  COLOURS,
  type Collection,
  type Product,
  type ProductType,
} from '@/data/products'

// ── Admin catalogue layer ──────────────────────────────────────────────────
// Admin-added products are persisted in localStorage and merged into the live
// catalogue so they appear in Collections, Product pages, search, etc.
// (Brief §9 — Products / Collections modules. Backend-free for this prototype.)

const STORAGE_KEY = 'suvadu_admin_products'

export interface ProductInput {
  name: string
  collectionSlug: string
  type: ProductType
  priceA5: number
  priceA4: number | null
  description: string
  image: string // admin-uploaded cover image (data URL)
  bestseller: boolean
  isNew: boolean
}

interface CatalogState {
  products: Product[] // base basics + admin products (shoppable grid catalogue)
  allProducts: Product[] // products + special products (search / slug lookup)
  collections: Collection[] // with counts reflecting admin products
  customProducts: Product[] // admin-added only (for the admin list)
  getProductBySlug: (slug: string) => Product | undefined
  getProductsByCollection: (slug: string) => Product[]
  getBestSellers: () => Product[]
  addProduct: (input: ProductInput) => { ok: boolean; message: string; product?: Product }
  deleteProduct: (id: string) => void
}

const CatalogContext = createContext<CatalogState | null>(null)

function load(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Product[]) : []
  } catch {
    return []
  }
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [customProducts, setCustomProducts] = useState<Product[]>(() => load())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customProducts))
  }, [customProducts])

  const products = useMemo(() => [...PRODUCTS, ...customProducts], [customProducts])
  const allProducts = useMemo(() => [...ALL_PRODUCTS, ...customProducts], [customProducts])

  // Collection counts reflect both seeded and admin-added products.
  const collections = useMemo<Collection[]>(
    () =>
      COLLECTIONS.map((c) => ({
        ...c,
        count: products.filter((p) => p.collectionSlug === c.slug).length,
      })),
    [products],
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
    (input: ProductInput): { ok: boolean; message: string; product?: Product } => {
      const name = input.name.trim()
      if (!name) return { ok: false, message: 'Product name is required.' }
      const collection = COLLECTIONS.find((c) => c.slug === input.collectionSlug)
      if (!collection) return { ok: false, message: 'Pick a valid collection.' }
      if (!input.priceA5 || input.priceA5 <= 0) return { ok: false, message: 'Enter a valid A5 price.' }

      // Unique slug across the whole catalogue.
      const base = slugify(name) || 'product'
      const existing = new Set(allProducts.map((p) => p.slug))
      let slug = base
      let n = 2
      while (existing.has(slug)) slug = `${base}-${n++}`

      const product: Product = {
        id: `PA-${Date.now()}`,
        slug,
        name,
        type: input.type,
        collectionSlug: collection.slug,
        collectionName: collection.displayName,
        prices: { A5: input.priceA5, A4: input.priceA4, Custom: null },
        customPriceOnRequest: input.type === 'customized',
        description: input.description.trim() || `${name} — part of the ${collection.displayName}.`,
        specs: ['100 GSM premium paper', '160 pages', 'Lay-flat binding'],
        // Cover colour/pattern are no longer entered in admin; defaults keep the
        // generated cover working anywhere the uploaded image isn't shown.
        colour: COLOURS[0],
        pattern: collection.pattern,
        image: input.image.trim() || undefined,
        rating: 5,
        reviews: 0,
        bestseller: input.bestseller,
        isNew: input.isNew,
      }
      setCustomProducts((prev) => [...prev, product])
      return { ok: true, message: `“${name}” added to ${collection.displayName}.`, product }
    },
    [allProducts],
  )

  const deleteProduct = useCallback(
    (id: string) => setCustomProducts((prev) => prev.filter((p) => p.id !== id)),
    [],
  )

  const value: CatalogState = {
    products,
    allProducts,
    collections,
    customProducts,
    getProductBySlug,
    getProductsByCollection,
    getBestSellers,
    addProduct,
    deleteProduct,
  }

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog(): CatalogState {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider')
  return ctx
}
