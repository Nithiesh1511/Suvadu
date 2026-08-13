import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Product, SizeKey } from '@/data/products'
import { DEFAULT_PAGES, priceForPages } from '@/data/products'
import { useAuth } from '@/context/AuthContext'
import { useCatalog } from '@/context/CatalogContext'
import { supabase } from '@/lib/supabase'
import { trackEvent } from '@/lib/analytics'

export interface Customization {
  name?: string
  text?: string
  font?: string
  colour?: string
}

export interface CartItem {
  key: string
  product: Product
  size: SizeKey
  qty: number
  unitPrice: number
  pages?: number
  ruling?: string // 'Ruled' | 'Unruled'
  customization?: Customization
}

interface User {
  name: string
  email: string
  mobile: string
}

interface StoreState {
  cart: CartItem[]
  wishlist: string[] // product ids
  user: User | null // derived from the authenticated Supabase profile
  coupon: string | null
  addToCart: (item: Omit<CartItem, 'key' | 'qty'> & { qty?: number }) => void
  removeFromCart: (key: string) => void
  updateQty: (key: string, qty: number) => void
  clearCart: () => void
  toggleWishlist: (productId: string) => void
  isWished: (productId: string) => boolean
  applyCoupon: (code: string) => { ok: boolean; message: string }
  removeCoupon: () => void
  cartCount: number
  subtotal: number
  discount: number
  total: number
}

const StoreContext = createContext<StoreState | null>(null)

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const { allProducts, loading: catalogLoading } = useCatalog()
  const [cart, setCart] = useState<CartItem[]>(() => load('suvadu_cart', []))
  const [wishlist, setWishlist] = useState<string[]>(() => load('suvadu_wishlist', []))
  const [coupon, setCoupon] = useState<string | null>(() => load('suvadu_coupon', null))
  // Valid coupon rates (code → fraction), loaded from the DB (admin-managed).
  const [couponRates, setCouponRates] = useState<Record<string, number>>({})
  const [ratesLoaded, setRatesLoaded] = useState(false)

  useEffect(() => {
    supabase.from('coupons').select('code, discount_pct, expires_at, active').then(({ data }) => {
      const now = Date.now()
      const map: Record<string, number> = {}
      for (const c of (data ?? []) as { code: string; discount_pct: number; expires_at: string | null; active?: boolean }[]) {
        if (c.active === false) continue
        if (c.expires_at && new Date(c.expires_at).getTime() < now) continue
        // Clamp the rate to [0, 1] so a bad DB row can never drive a negative total.
        map[c.code] = Math.min(1, Math.max(0, Number(c.discount_pct) / 100))
      }
      setCouponRates(map)
      setRatesLoaded(true)
    })
  }, [])

  // User identity is owned by AuthContext; expose a lightweight view for the
  // storefront (prefilling checkout, wishlist gating, greeting).
  const user = useMemo<User | null>(
    () =>
      profile
        ? { name: profile.name ?? '', email: profile.email ?? '', mobile: profile.mobile ?? '' }
        : null,
    [profile],
  )

  useEffect(() => { localStorage.setItem('suvadu_cart', JSON.stringify(cart)) }, [cart])
  useEffect(() => { localStorage.setItem('suvadu_wishlist', JSON.stringify(wishlist)) }, [wishlist])
  useEffect(() => { localStorage.setItem('suvadu_coupon', JSON.stringify(coupon)) }, [coupon])

  // Reconcile cart items with the live catalogue once it has loaded: refresh the
  // unit price (and product snapshot) so a price the admin changed after an item
  // was added can't linger in someone's cart, and DROP items whose product was
  // removed/unpublished so they can't be checked out at a stale price.
  useEffect(() => {
    if (catalogLoading) return
    // Guard: if the catalogue came back empty (e.g. a transient load failure),
    // don't treat every product as "removed" and wipe the cart.
    if (allProducts.length === 0) return
    setCart((prev) => {
      let changed = false
      const next: CartItem[] = []
      for (const item of prev) {
        const p = allProducts.find((x) => x.id === item.product.id)
        if (!p) {
          // Product no longer in the catalogue — remove it from the cart.
          changed = true
          continue
        }
        const base = p.prices[item.size]
        if (base == null) {
          // The size this item used is no longer offered — drop it.
          changed = true
          continue
        }
        const fresh = priceForPages(base, item.pages ?? DEFAULT_PAGES)
        if (fresh !== item.unitPrice || p !== item.product) {
          changed = true
          next.push({ ...item, unitPrice: fresh, product: p })
        } else {
          next.push(item)
        }
      }
      return changed ? next : prev
    })
  }, [allProducts, catalogLoading])

  // Once the coupon rates have loaded, drop a persisted coupon that is no longer
  // valid (expired or deleted by admin) so the Cart can't show it as "applied"
  // with a silent ₹0 discount. Only runs after the async rates fetch resolves.
  useEffect(() => {
    if (!ratesLoaded) return
    if (coupon && couponRates[coupon] == null) setCoupon(null)
  }, [ratesLoaded, coupon, couponRates])

  function addToCart(item: Omit<CartItem, 'key' | 'qty'> & { qty?: number }) {
    const custKey = item.customization ? JSON.stringify(item.customization) : ''
    const key = `${item.product.id}-${item.size}-${item.pages ?? ''}-${item.ruling ?? ''}-${custKey}`
    setCart((prev) => {
      const existing = prev.find((c) => c.key === key)
      if (existing) {
        return prev.map((c) => (c.key === key ? { ...c, qty: c.qty + (item.qty ?? 1) } : c))
      }
      return [...prev, { ...item, key, qty: item.qty ?? 1 }]
    })
    trackEvent('add_to_cart', {
      currency: 'INR',
      value: item.unitPrice * (item.qty ?? 1),
      items: [{ item_id: item.product.id, item_name: item.product.name, quantity: item.qty ?? 1, price: item.unitPrice }],
    })
  }

  const removeFromCart = (key: string) => setCart((p) => p.filter((c) => c.key !== key))
  const updateQty = (key: string, qty: number) =>
    setCart((p) => p.map((c) => (c.key === key ? { ...c, qty: Math.max(1, qty) } : c)))
  const clearCart = () => setCart([])

  const toggleWishlist = (id: string) =>
    setWishlist((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const isWished = (id: string) => wishlist.includes(id)

  function applyCoupon(code: string) {
    const normalized = code.trim().toUpperCase()
    if (!normalized) return { ok: false, message: 'Enter a coupon code.' }
    if (!ratesLoaded) return { ok: false, message: 'Still loading offers — please try again in a moment.' }
    if (couponRates[normalized] != null) {
      setCoupon(normalized)
      return { ok: true, message: `Coupon ${normalized} applied — ${Math.round(couponRates[normalized] * 100)}% off!` }
    }
    return { ok: false, message: 'That coupon code isn’t valid.' }
  }
  const removeCoupon = () => setCoupon(null)

  const { cartCount, subtotal, discount, total } = useMemo(() => {
    const count = cart.reduce((s, c) => s + c.qty, 0)
    const sub = cart.reduce((s, c) => s + c.unitPrice * c.qty, 0)
    const rate = coupon ? couponRates[coupon] ?? 0 : 0
    // Clamp so the discount can never exceed the subtotal (guards against a bad
    // coupon rate producing a negative total that would flow into the order).
    const disc = Math.min(sub, Math.round(sub * rate))
    return { cartCount: count, subtotal: sub, discount: disc, total: Math.max(0, sub - disc) }
  }, [cart, coupon, couponRates])

  const value: StoreState = {
    cart, wishlist, user, coupon,
    addToCart, removeFromCart, updateQty, clearCart,
    toggleWishlist, isWished,
    applyCoupon, removeCoupon,
    cartCount, subtotal, discount, total,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreState {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
