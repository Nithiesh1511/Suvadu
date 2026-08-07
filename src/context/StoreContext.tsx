import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Product, SizeKey } from '@/data/products'
import { COUPONS } from '@/data/products'

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
  user: User | null
  coupon: string | null
  addToCart: (item: Omit<CartItem, 'key' | 'qty'> & { qty?: number }) => void
  removeFromCart: (key: string) => void
  updateQty: (key: string, qty: number) => void
  clearCart: () => void
  toggleWishlist: (productId: string) => void
  isWished: (productId: string) => boolean
  applyCoupon: (code: string) => { ok: boolean; message: string }
  removeCoupon: () => void
  login: (user: User) => void
  logout: () => void
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
  const [cart, setCart] = useState<CartItem[]>(() => load('suvadu_cart', []))
  const [wishlist, setWishlist] = useState<string[]>(() => load('suvadu_wishlist', []))
  const [user, setUser] = useState<User | null>(() => load('suvadu_user', null))
  const [coupon, setCoupon] = useState<string | null>(() => load('suvadu_coupon', null))

  useEffect(() => { localStorage.setItem('suvadu_cart', JSON.stringify(cart)) }, [cart])
  useEffect(() => { localStorage.setItem('suvadu_wishlist', JSON.stringify(wishlist)) }, [wishlist])
  useEffect(() => { localStorage.setItem('suvadu_user', JSON.stringify(user)) }, [user])
  useEffect(() => { localStorage.setItem('suvadu_coupon', JSON.stringify(coupon)) }, [coupon])

  function addToCart(item: Omit<CartItem, 'key' | 'qty'> & { qty?: number }) {
    const custKey = item.customization ? JSON.stringify(item.customization) : ''
    const key = `${item.product.id}-${item.size}-${item.pages ?? ''}-${custKey}`
    setCart((prev) => {
      const existing = prev.find((c) => c.key === key)
      if (existing) {
        return prev.map((c) => (c.key === key ? { ...c, qty: c.qty + (item.qty ?? 1) } : c))
      }
      return [...prev, { ...item, key, qty: item.qty ?? 1 }]
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
    if (COUPONS[normalized] != null) {
      setCoupon(normalized)
      return { ok: true, message: `Coupon ${normalized} applied — ${Math.round(COUPONS[normalized] * 100)}% off!` }
    }
    return { ok: false, message: 'That coupon code isn’t valid.' }
  }
  const removeCoupon = () => setCoupon(null)

  const login = (u: User) => setUser(u)
  const logout = () => setUser(null)

  const { cartCount, subtotal, discount, total } = useMemo(() => {
    const count = cart.reduce((s, c) => s + c.qty, 0)
    const sub = cart.reduce((s, c) => s + c.unitPrice * c.qty, 0)
    const rate = coupon ? COUPONS[coupon] ?? 0 : 0
    const disc = Math.round(sub * rate)
    return { cartCount: count, subtotal: sub, discount: disc, total: sub - disc }
  }, [cart, coupon])

  const value: StoreState = {
    cart, wishlist, user, coupon,
    addToCart, removeFromCart, updateQty, clearCart,
    toggleWishlist, isWished,
    applyCoupon, removeCoupon,
    login, logout,
    cartCount, subtotal, discount, total,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreState {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
