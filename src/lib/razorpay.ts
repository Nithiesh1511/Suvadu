import { supabase } from '@/lib/supabase'

// ── Razorpay checkout helpers ────────────────────────────────────────────────
// Loads the hosted checkout.js on demand and calls our two Edge Functions.
// The key SECRET lives only in the functions; the browser only ever sees the
// public key id (returned by create-order).

declare global {
  interface Window {
    // Razorpay's global is untyped; we only touch a small, known surface.
    Razorpay?: new (options: RazorpayOptions) => { open: () => void; on: (e: string, cb: (r: RazorpayFailure) => void) => void }
  }
}

export interface RazorpaySuccess {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}
export interface RazorpayFailure {
  error?: { description?: string }
}
export interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description?: string
  order_id: string
  prefill?: { name?: string; email?: string; contact?: string }
  theme?: { color?: string }
  handler: (response: RazorpaySuccess) => void
  modal?: { ondismiss?: () => void }
}

export interface CreatedOrder {
  keyId: string
  razorpayOrderId: string
  amount: number
  currency: string
  orderNumber: string
}

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'
let scriptPromise: Promise<boolean> | null = null

/** Inject checkout.js once; resolves false if it fails to load. */
export function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = CHECKOUT_SRC
    s.onload = () => resolve(true)
    s.onerror = () => { scriptPromise = null; resolve(false) }
    document.body.appendChild(s)
  })
  return scriptPromise
}

export async function createRazorpayOrder(orderId: string): Promise<CreatedOrder> {
  const { data, error } = await supabase.functions.invoke('razorpay-create-order', { body: { orderId } })
  if (error) throw new Error(error.message)
  if (!data || data.error) throw new Error(data?.error ?? 'Could not start payment.')
  return data as CreatedOrder
}

export async function verifyRazorpayPayment(payload: RazorpaySuccess): Promise<void> {
  const { data, error } = await supabase.functions.invoke('razorpay-verify-payment', { body: payload })
  if (error) throw new Error(error.message)
  if (!data?.ok) throw new Error(data?.error ?? 'Payment verification failed.')
}
