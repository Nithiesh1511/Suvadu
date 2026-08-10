// ── Edge Function: razorpay-verify-payment ───────────────────────────────────
// Verifies the Razorpay payment signature (HMAC-SHA256 of "order_id|payment_id"
// with the key secret). Only on a valid signature do we mark the order paid.
// This MUST run server-side — a client-side check is trivially forgeable.
//
// Required secret: RAZORPAY_KEY_SECRET
// Auto-injected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json().catch(() => ({}))
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ ok: false, error: 'Missing payment fields.' }, 400)
    }

    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!keySecret) return json({ ok: false, error: 'Razorpay secret is not configured on the server.' }, 500)

    const expected = await hmacHex(keySecret, `${razorpay_order_id}|${razorpay_payment_id}`)
    if (!timingSafeEqual(expected, razorpay_signature)) {
      return json({ ok: false, error: 'Signature verification failed.' }, 400)
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { error } = await admin
      .from('orders')
      .update({ status: 'processing', razorpay_payment_id })
      .eq('razorpay_order_id', razorpay_order_id)
    if (error) return json({ ok: false, error: error.message }, 500)

    return json({ ok: true })
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500)
  }
})

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Constant-time comparison to avoid leaking signature bytes via timing.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
