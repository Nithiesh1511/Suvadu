import { createClient } from '@supabase/supabase-js'

// ── Supabase client ─────────────────────────────────────────────────────────
// The URL + anon (publishable) key are public by design — access is gated by
// Row-Level Security on the server, not by hiding the key. They come from Vite
// env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) set in .env.local.

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Fail loud in dev so a missing .env.local is obvious, not a silent blank store.
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env.local and set ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// ── Row shapes (mirror supabase/migrations/0001_init.sql) ────────────────────
export interface CollectionRow {
  slug: string
  display_name: string
  internal_name: string
  description: string
  accent: string
  pattern: string
  sort_order: number
  is_special: boolean
}

export interface ProductRow {
  id: string
  slug: string
  name: string
  type: string
  collection_slug: string
  price_a5: number
  price_a4: number | null
  price_custom: number | null
  custom_price_on_request: boolean
  description: string
  specs: string[]
  colour_name: string
  colour_hex: string
  pattern: string
  image: string | null
  rating: number
  reviews: number
  bestseller: boolean
  is_new: boolean
  is_custom: boolean
  stock: number | null   // null = not tracked / unlimited; 0 = out of stock
  created_at: string
}

export interface ProfileRow {
  id: string
  name: string | null
  email: string | null
  mobile: string | null
  is_admin: boolean
}

export interface OrderRow {
  id: string
  order_number: string
  user_id: string | null
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  subtotal: number
  discount: number
  shipping: number
  total: number
  coupon: string | null
  payment_method: string | null
  address: {
    name: string
    email: string
    mobile: string
    address: string
    city: string
    state: string
    pincode: string
  }
  created_at: string
}

export interface OrderItemRow {
  id: string
  order_id: string
  product_id: string
  product_name: string
  product_slug: string
  size: string
  qty: number
  unit_price: number
  pages: number | null
  customization: Record<string, unknown> | null
}

// ── Admin-managed content (0003_admin.sql) ───────────────────────────────────
export interface CouponRow {
  code: string
  discount_pct: number
  active: boolean
  expires_at: string | null
  created_at: string
}

export interface ColourRow {
  name: string
  hex: string
  active: boolean
  sort_order: number
  created_at: string
}

export interface FaqRow {
  id: string
  category: string
  question: string
  answer: string
  sort_order: number
  created_at: string
}

export interface ReviewRow {
  id: string
  product_id: string | null
  author_name: string
  rating: number
  text: string
  location: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export interface BannerRow {
  id: string
  title: string
  subtitle: string
  image_url: string | null
  link: string | null
  active: boolean
  sort_order: number
  created_at: string
}

export interface ContactRequestRow {
  id: string
  name: string
  email: string
  phone: string | null
  message: string
  status: 'new' | 'resolved'
  created_at: string
}
