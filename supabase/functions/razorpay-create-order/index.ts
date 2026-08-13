// ── Edge Function: razorpay-create-order ─────────────────────────────────────
// Creates a Razorpay order server-side (the secret never reaches the browser),
// binds it to our own order row, and returns the details the client needs to
// open the Razorpay checkout modal.
//
// Required secrets (supabase secrets set ...):
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
// Auto-injected by Supabase: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { orderId } = await req.json().catch(() => ({}))
    if (!orderId) return json({ error: 'orderId is required.' }, 400)

    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const keyId = Deno.env.get('RAZORPAY_KEY_ID')
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!keyId || !keySecret) return json({ error: 'Razorpay keys are not configured on the server.' }, 500)

    // Identify the caller from their JWT.
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Not authenticated.' }, 401)

    // Load the order with the service role and confirm it belongs to the caller.
    const admin = createClient(url, serviceKey)
    const { data: order, error } = await admin.from('orders').select('*').eq('id', orderId).single()
    if (error || !order) return json({ error: 'Order not found.' }, 404)
    if (order.user_id !== user.id) return json({ error: 'Forbidden.' }, 403)

    // ⚠️ SECURITY — server-authoritative pricing (do this before going live).
    // The order row's subtotal/discount/total were written by the client, so the
    // amount below currently trusts client-supplied numbers. Before charging real
    // money, recompute the total here from order_items × the live `products`
    // prices (+ page factor) and the validated coupon, and reject if it disagrees
    // with order.total. Reference implementation to add when Razorpay resumes:
    //   const { data: items } = await admin.from('order_items')
    //     .select('product_id, size, qty, pages').eq('order_id', order.id)
    //   // look up products, apply PAGE_PRICE_FACTOR, sum, apply coupon → expected
    //   if (Math.round(expected) !== Math.round(Number(order.total))) return json(...)
    const amount = Math.round(Number(order.total) * 100) // Razorpay expects the smallest unit (paise)
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + btoa(`${keyId}:${keySecret}`),
      },
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt: order.order_number,
        notes: { order_id: order.id },
      }),
    })
    const rzp = await rzpRes.json()
    if (!rzpRes.ok) return json({ error: rzp?.error?.description ?? 'Razorpay order creation failed.' }, 502)

    await admin.from('orders').update({ razorpay_order_id: rzp.id }).eq('id', order.id)

    return json({
      keyId,
      razorpayOrderId: rzp.id,
      amount,
      currency: 'INR',
      orderNumber: order.order_number,
    })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
