import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '@/context/StoreContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { loadRazorpay, createRazorpayOrder, verifyRazorpayPayment } from '@/lib/razorpay'
import { trackEvent } from '@/lib/analytics'
import { useToast } from '@/components/Toast'
import PageHeader from '@/components/PageHeader'
import ProductImage from '@/components/ProductImage'
import { Check, ArrowRight, Pen } from '@/components/Icons'
import { formatINR, cn, isEmail, isMobile } from '@/lib/utils'

export default function Checkout() {
  const { cart, subtotal, discount, total, coupon, clearCart, user } = useStore()
  const { session } = useAuth()
  const navigate = useNavigate()
  const { notify } = useToast()

  const [form, setForm] = useState({
    name: user?.name ?? '', email: user?.email ?? '', mobile: user?.mobile ?? '',
    address: '', city: '', state: '', pincode: '',
  })
  // Actual method (UPI/card/net-banking) is chosen inside the Razorpay modal.
  const paymentMethod = 'Razorpay'
  const [editing, setEditing] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)

  const grandTotal = total

  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  const addressComplete = Boolean(
    form.name && isEmail(form.email) && isMobile(form.mobile) &&
    form.address && form.city && form.state && /^\d{6}$/.test(form.pincode),
  )

  function saveAddress(e: React.FormEvent) {
    e.preventDefault()
    if (!addressComplete) { notify('Please enter your name, a valid email, a 10-digit mobile, full address and a 6-digit pincode.'); return }
    setEditing(false)
    notify('Delivery address saved')
  }

  function completeOrder(orderNumber: string) {
    trackEvent('purchase', { transaction_id: orderNumber, value: grandTotal, currency: 'INR' })
    setOrderId(orderNumber)
    clearCart()
    window.scrollTo({ top: 0 })
  }

  async function placeOrder() {
    if (!addressComplete) { notify('Please complete your delivery address.'); setEditing(true); return }
    if (!session) { notify('Please sign in to place your order.'); navigate('/account'); return }
    setPlacing(true)

    // 1. Persist the order as 'pending' along with its line items.
    const orderNumber = 'SUV' + Math.floor(100000 + (Date.now() % 900000))
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: session.user.id,
        status: 'pending',
        subtotal,
        discount,
        shipping: 0,
        total: grandTotal,
        coupon,
        payment_method: paymentMethod,
        address: form,
      })
      .select()
      .single()

    if (error || !order) {
      setPlacing(false)
      notify(`Could not place order: ${error?.message ?? 'unknown error'}`)
      return
    }

    const items = cart.map((c) => ({
      order_id: order.id,
      product_id: c.product.id,
      product_name: c.product.name,
      product_slug: c.product.slug,
      size: c.size,
      qty: c.qty,
      unit_price: c.unitPrice,
      pages: c.pages ?? null,
      customization:
        c.customization || c.ruling
          ? { ...(c.customization ?? {}), ...(c.ruling ? { ruling: c.ruling } : {}) }
          : null,
    }))
    const { error: itemsError } = await supabase.from('order_items').insert(items)
    if (itemsError) notify(`Order saved but items failed to record: ${itemsError.message}`)

    // 2. Create the Razorpay order (server-side) and open the checkout modal.
    const loaded = await loadRazorpay()
    if (!loaded || !window.Razorpay) {
      setPlacing(false)
      notify('Could not load the payment gateway. Please check your connection and retry.')
      return
    }

    let created
    try {
      created = await createRazorpayOrder(order.id)
    } catch (e) {
      setPlacing(false)
      notify(`Payment setup failed: ${(e as Error).message}`)
      return
    }

    const rzp = new window.Razorpay({
      key: created.keyId,
      amount: created.amount,
      currency: created.currency,
      name: 'SUVADU Notebooks',
      description: `Order ${created.orderNumber}`,
      order_id: created.razorpayOrderId,
      prefill: { name: form.name, email: form.email, contact: form.mobile },
      theme: { color: '#613092' },
      handler: async (resp) => {
        // 3. Verify the signature server-side, then confirm.
        try {
          await verifyRazorpayPayment(resp)
          completeOrder(created!.orderNumber)
        } catch (e) {
          notify(`Payment verification failed: ${(e as Error).message}`)
        } finally {
          setPlacing(false)
        }
      },
      modal: {
        ondismiss: () => {
          setPlacing(false)
          notify('Payment cancelled — your order is saved as pending.')
        },
      },
    })
    rzp.on('payment.failed', (r) => {
      setPlacing(false)
      notify(`Payment failed: ${r.error?.description ?? 'please try again.'}`)
    })
    rzp.open()
  }

  // ---- Order confirmation ----
  if (orderId) {
    return (
      <div>
        <PageHeader title="Order Confirmed" crumbs={[{ label: 'Checkout', to: '/cart' }, { label: 'Confirmation' }]} />
        <section className="container-suvadu py-16">
          <div className="card-surface mx-auto flex max-w-xl flex-col items-center px-6 py-14 text-center">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-royal text-white shadow-lift animate-fade-up"><Check width={40} /></span>
            <h2 className="mt-7 font-display text-4xl text-plum">Thank you!</h2>
            <p className="mt-3 max-w-md font-body text-base font-light text-muted-foreground">
              Your payment was successful and your order is being prepared. A confirmation has been sent to your email.
            </p>
            <div className="mt-6 rounded-2xl bg-lilac/60 px-8 py-4">
              <p className="font-body text-xs uppercase tracking-wide text-muted-foreground">Order ID</p>
              <p className="font-display text-2xl text-royal">{orderId}</p>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/account" className="btn-primary">View My Orders</Link>
              <Link to="/collections" className="btn-secondary">Continue Shopping</Link>
            </div>
          </div>
        </section>
      </div>
    )
  }

  // ---- Empty guard ----
  if (cart.length === 0) {
    return (
      <div>
        <PageHeader title="Checkout" crumbs={[{ label: 'Checkout' }]} />
        <section className="container-suvadu py-20 text-center">
          <h2 className="font-display text-3xl text-plum">Your cart is empty</h2>
          <p className="mt-2 font-body text-sm font-light text-muted-foreground">Add a notebook before checking out.</p>
          <Link to="/collections" className="btn-primary btn-lg mt-7">Browse Collections</Link>
        </section>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Checkout" subtitle="Almost there — just your details and payment." crumbs={[{ label: 'Cart', to: '/cart' }, { label: 'Checkout' }]} />

      <section className="container-suvadu grid gap-10 py-12 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-8">
          {/* Address */}
          <div className="card-surface p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-plum">Delivery Address</h2>
              {!editing && <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 font-body text-sm font-medium text-royal hover:underline"><Pen width={14} /> Edit Address</button>}
            </div>

            {editing ? (
              <form onSubmit={saveAddress} className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Full Name" value={form.name} onChange={(v) => set('name', v)} className="sm:col-span-2" />
                <Field label="Email" type="email" value={form.email} onChange={(v) => set('email', v)} />
                <Field label="Mobile Number" type="tel" value={form.mobile} onChange={(v) => set('mobile', v.replace(/\D/g, '').slice(0, 10))} />
                <Field label="Address" value={form.address} onChange={(v) => set('address', v)} className="sm:col-span-2" />
                <Field label="City" value={form.city} onChange={(v) => set('city', v)} />
                <Field label="State" value={form.state} onChange={(v) => set('state', v)} />
                <Field label="Pincode" value={form.pincode} onChange={(v) => set('pincode', v.replace(/\D/g, '').slice(0, 6))} />
                <div className="sm:col-span-2">
                  <button type="submit" className="btn-primary">Save & Continue</button>
                </div>
              </form>
            ) : (
              <div className="mt-4 font-body text-sm font-light leading-relaxed text-plum/80">
                <p className="font-medium text-plum">{form.name}</p>
                <p>{form.address}, {form.city}, {form.state} — {form.pincode}</p>
                <p>{form.mobile} · {form.email}</p>
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="card-surface p-6">
            <h2 className="font-display text-2xl text-plum">Payment</h2>
            <p className="mt-1 font-body text-xs font-light text-muted-foreground">Secured by Razorpay · PCI-DSS compliant</p>
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-royal/20 bg-lilac/40 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-royal text-white"><Check width={16} /></span>
              <div>
                <p className="font-body text-sm font-medium text-plum">Pay securely with Razorpay</p>
                <p className="mt-0.5 font-body text-xs font-light text-muted-foreground">
                  Choose UPI, Credit/Debit Card or Net Banking on the next step — the secure Razorpay window opens when you place your order.
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 font-body text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {['UPI', 'Cards', 'Net Banking', 'Wallets'].map((m) => (
                <span key={m} className="rounded-full border border-border px-3 py-1">{m}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <aside className="h-fit lg:sticky lg:top-24">
          <div className="card-surface p-6">
            <h2 className="font-display text-2xl text-plum">Order Summary</h2>
            <ul className="mt-5 space-y-4 border-b border-border pb-5">
              {cart.map((item) => (
                <li key={item.key} className="flex gap-3">
                  <div className="w-12 shrink-0"><ProductImage image={item.product.image} alt={item.product.name} colour={item.product.colour.hex} pattern={item.product.pattern} /></div>
                  <div className="flex flex-1 items-start justify-between gap-2">
                    <div>
                      <p className="font-body text-sm font-medium text-plum">{item.product.name}</p>
                      <p className="font-body text-xs font-light text-muted-foreground">{item.size}{item.pages ? ` · ${item.pages}p` : ''}{item.ruling ? ` · ${item.ruling}` : ''} · Qty {item.qty}</p>
                      {item.customization && (item.customization.name || item.customization.text) && (
                        <p className="font-body text-xs font-light text-royal">“{item.customization.name || item.customization.text}”</p>
                      )}
                    </div>
                    <p className="font-body text-sm font-medium text-plum">{formatINR(item.unitPrice * item.qty)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-3 font-body text-sm">
              <div className="flex justify-between"><dt className="font-light text-muted-foreground">Subtotal</dt><dd className="font-medium text-plum">{formatINR(subtotal)}</dd></div>
              {discount > 0 && <div className="flex justify-between"><dt className="font-light text-muted-foreground">Discount ({coupon})</dt><dd className="font-medium text-royal">– {formatINR(discount)}</dd></div>}
            </dl>
            <div className="mt-5 flex items-center justify-between border-t border-border pt-5">
              <span className="font-display text-lg text-plum">Total</span>
              <span className="font-body text-2xl font-medium text-plum">{formatINR(grandTotal)}</span>
            </div>

            <button onClick={placeOrder} disabled={placing} className="btn-primary btn-lg mt-6 w-full">
              {placing ? 'Processing payment…' : <>Place Order <ArrowRight width={17} /></>}
            </button>
            <Link to="/cart" className="mt-3 block text-center font-body text-sm font-medium text-royal hover:underline">Back to Cart</Link>
          </div>
        </aside>
      </section>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', className }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; className?: string
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block font-body text-xs font-medium uppercase tracking-wide text-plum">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="field" required />
    </label>
  )
}
