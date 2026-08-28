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
import { ACCESSORY_PRICES, couponRate, priceOrder } from '../_shared/pricing.ts'

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

    // ── Server-authoritative pricing ─────────────────────────────────────────
    // The order row's subtotal/discount/total were written by the browser, so
    // they cannot be trusted. Recompute the true cost from the line items, the
    // live `products` prices and the coupon as the database has it, and refuse
    // to charge anything if the browser's number disagrees.
    const { data: itemRows, error: itemsError } = await admin
      .from('order_items')
      .select('product_id, size, qty, pages')
      .eq('order_id', order.id)
    if (itemsError) return json({ error: 'Could not read this order.' }, 500)

    const items = itemRows ?? []
    const catalogueIds = [...new Set(items.map((i) => i.product_id))].filter(
      (id) => ACCESSORY_PRICES[id] == null,
    )

    let productRows: { id: string; price_a5: number | null; price_a4: number | null; price_custom: number | null }[] = []
    if (catalogueIds.length > 0) {
      const { data, error: prodError } = await admin
        .from('products')
        .select('id, price_a5, price_a4, price_custom')
        .in('id', catalogueIds)
      if (prodError) return json({ error: 'Could not read current prices.' }, 500)
      productRows = data ?? []
    }

    let rate = 0
    if (order.coupon) {
      const { data: couponRow } = await admin
        .from('coupons')
        .select('code, discount_pct, expires_at, active')
        .eq('code', order.coupon)
        .maybeSingle()
      rate = couponRate(couponRow, Date.now())
    }

    // A refused order can never be paid as it stands, and the shopper has to go
    // back to the cart to build a new one. Clear it here rather than leaving a
    // pending order they can neither pay for nor cancel. (Only the service role
    // can: there is no DELETE policy on `orders` for the owner, so the browser
    // cannot do this itself. `order_items` cascades.)
    const discardOrder = () => admin.from('orders').delete().eq('id', order.id)

    const priced = priceOrder(items, productRows, rate)
    if (!priced.ok) {
      await discardOrder()
      return json({ error: priced.error }, 400)
    }

    if (Math.round(priced.value.total) !== Math.round(Number(order.total))) {
      // Never silently charge a different amount than the shopper was shown —
      // send them back to the cart, where the reconciler refreshes prices.
      await discardOrder()
      return json(
        {
          error:
            'Prices in your cart have changed since you started checking out. Please go back to your cart and try again.',
        },
        409,
      )
    }

    // Keep the stored figures in step with what was actually verified, so the
    // admin console and the order history show the authoritative numbers.
    if (
      Math.round(Number(order.subtotal)) !== priced.value.subtotal ||
      Math.round(Number(order.discount)) !== priced.value.discount
    ) {
      await admin
        .from('orders')
        .update({ subtotal: priced.value.subtotal, discount: priced.value.discount })
        .eq('id', order.id)
    }

    const amount = Math.round(priced.value.total * 100) // Razorpay expects the smallest unit (paise)
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
