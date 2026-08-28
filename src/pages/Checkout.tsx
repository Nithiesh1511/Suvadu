import { useEffect, useRef, useState } from 'react'
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

// Collision-resistant, human-readable order number: time component (base36) plus
// a short random suffix. Unique in practice; the insert also retries on the rare
// clash against the order_number UNIQUE constraint.
/** One row of the shopper's address book (public.addresses). */
interface SavedAddress {
  id: string
  label: string
  line: string
  city: string
  state: string
  pincode: string
}

function makeOrderNumber(): string {
  const t = Date.now().toString(36).toUpperCase().slice(-6)
  const r = Math.floor(Math.random() * 46656).toString(36).toUpperCase().padStart(3, '0')
  return `SUV${t}${r}`
}

export default function Checkout() {
  const { cart, subtotal, discount, total, coupon, clearCart, user } = useStore()
  const { session, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { notify } = useToast()

  const [form, setForm] = useState({
    name: user?.name ?? '', email: user?.email ?? '', mobile: user?.mobile ?? '',
    address: '', city: '', state: '', pincode: '',
  })

  // The profile loads asynchronously; if it resolves after this page mounted,
  // backfill the contact fields the signed-in user would otherwise retype.
  useEffect(() => {
    if (!user) return
    setForm((f) => ({
      ...f,
      name: f.name || user.name,
      email: f.email || user.email,
      mobile: f.mobile || user.mobile,
    }))
  }, [user])
  // ── Saved addresses ──────────────────────────────────────────────────────
  // The account area has an address book whose empty state promises "faster
  // checkout". It only means anything if checkout actually offers what's in it.
  const [saved, setSaved] = useState<SavedAddress[]>([])
  const [savedLoaded, setSavedLoaded] = useState(false)
  const [saveToBook, setSaveToBook] = useState(false)
  /** id of the saved address in use, or null while typing a new one. */
  const [pickedId, setPickedId] = useState<string | null>(null)
  /** Has the shopper typed in the address fields? A ref, not state: the saved
   *  addresses arrive asynchronously and must not clobber what's being typed,
   *  but that check must not re-run renders or land inside a state updater. */
  const addressTouched = useRef(false)
  /** undefined until the first run, so a fresh mount isn't mistaken for a
   *  change of shopper. */
  const previousUserId = useRef<string | null | undefined>(undefined)

  const userId = session?.user.id ?? null

  useEffect(() => {
    let active = true

    // Whose details are on the form? This component stays mounted across a
    // sign-out (the gate below is an early return, not an unmount), so when a
    // different person signs in, everything the last one typed has to go —
    // name and contact details included, or their order ships under the
    // previous shopper's name. Only on an actual change of identity, though:
    // wiping on first mount would undo the prefill from the profile.
    const switchedUser = previousUserId.current !== undefined && previousUserId.current !== userId
    previousUserId.current = userId
    if (switchedUser) {
      setForm({ name: '', email: '', mobile: '', address: '', city: '', state: '', pincode: '' })
      setEditing(true)
    }
    setSaved([])
    setPickedId(null)
    setSaveToBook(false)
    addressTouched.current = false

    if (!userId) { setSavedLoaded(true); return }
    setSavedLoaded(false)
    supabase
      .from('addresses')
      .select('id, label, line, city, state, pincode')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return
        setSavedLoaded(true)
        // A failure here just means no picker — the plain form still works.
        if (error) return
        const rows = (data as SavedAddress[]) ?? []
        setSaved(rows)
        if (rows.length === 0) return
        // Land on the first saved address rather than a blank form — but not
        // over anything the shopper started typing while this was in flight,
        // and only mark it selected when we actually applied it.
        if (addressTouched.current) return
        const first = rows[0]
        setForm((f) => ({ ...f, address: first.line, city: first.city, state: first.state, pincode: first.pincode }))
        setPickedId(first.id)
      })
    return () => { active = false }
  }, [userId])

  function applySavedAddress(a: SavedAddress) {
    addressTouched.current = false
    setPickedId(a.id)
    setForm((f) => ({ ...f, address: a.line, city: a.city, state: a.state, pincode: a.pincode }))
  }

  function startNewAddress() {
    addressTouched.current = true
    setPickedId(null)
    setForm((f) => ({ ...f, address: '', city: '', state: '', pincode: '' }))
  }

  /** Persist a newly typed address so the next order is one tap. */
  async function persistAddress() {
    if (!session || !saveToBook || pickedId) return
    const { data, error } = await supabase
      .from('addresses')
      .insert({
        user_id: session.user.id,
        label: 'Delivery address',
        line: form.address,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
      })
      .select('id, label, line, city, state, pincode')
      .single()
    if (error || !data) return // Saving is a convenience; never block the order.
    setSaved((p) => [...p, data as SavedAddress])
    setPickedId((data as SavedAddress).id)
    setSaveToBook(false)
  }

  // Actual method (UPI/card/net-banking) is chosen inside the Razorpay modal.
  const paymentMethod = 'Razorpay'
  const [editing, setEditing] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)

  const grandTotal = total

  const ADDRESS_FIELDS: readonly string[] = ['address', 'city', 'state', 'pincode']

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
    // Typing over a saved address means this is a new one — otherwise the picker
    // keeps a card highlighted that no longer matches the form, and the "save
    // this address" offer stays hidden so the edit could never be kept.
    if (ADDRESS_FIELDS.includes(k as string)) {
      addressTouched.current = true
      setPickedId(null)
    }
  }

  const addressComplete = Boolean(
    form.name && isEmail(form.email) && isMobile(form.mobile) &&
    form.address && form.city && form.state && /^\d{6}$/.test(form.pincode),
  )

  function saveAddress(e: React.FormEvent) {
    e.preventDefault()
    if (!addressComplete) { notify('Please enter your name, a valid email, a 10-digit mobile, full address and a 6-digit pincode.'); return }
    setEditing(false)
    void persistAddress()
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
    //    Retry on the rare order_number collision (unique constraint, code 23505).
    let order: { id: string } | null = null
    let orderNumber = ''
    for (let attempt = 0; attempt < 4 && !order; attempt++) {
      orderNumber = makeOrderNumber()
      const { data, error } = await supabase
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
      if (data) { order = data; break }
      // 23505 = unique_violation → regenerate and retry; anything else is fatal.
      if (error?.code !== '23505') {
        setPlacing(false)
        notify(`Could not place order: ${error?.message ?? 'unknown error'}`)
        return
      }
    }
    if (!order) {
      setPlacing(false)
      notify('Could not place order — please try again.')
      return
    }

    const items = cart.map((c) => ({
      order_id: order!.id,
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
    if (itemsError) {
      // Don't leave an order with no line items behind — roll it back and abort
      // before charging anything.
      await supabase.from('orders').delete().eq('id', order.id)
      setPlacing(false)
      notify(`Could not record your items: ${itemsError.message}. Please try again.`)
      return
    }

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
      // Nothing was charged. If the server refused the price it also cleared
      // the pending order, so a retry starts clean — see razorpay-create-order.
      setPlacing(false)
      notify((e as Error).message)
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
          // Deliberately NOT deleted here. The gateway order already exists, and
          // with an async method (UPI collect) a payment can still land after
          // the modal is closed — there is no webhook to tell us. Deleting would
          // erase the record of a payment that then succeeds. The order stays
          // pending and Account explains what to do about it.
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
          <div className="card-surface mx-auto flex max-w-xl flex-col items-center px-5 py-12 text-center sm:px-6 sm:py-14">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-royal text-white shadow-lift animate-fade-up sm:h-20 sm:w-20"><Check width={40} /></span>
            <h2 className="mt-7 font-display text-3xl text-plum sm:text-4xl">Thank you!</h2>
            <p className="mt-3 max-w-md font-body text-base font-light text-muted-foreground">
              Your payment was successful and your order is being prepared. You can track it any time under My Orders.
            </p>
            <div className="mt-6 max-w-full rounded-2xl bg-lilac/60 px-6 py-4 sm:px-8">
              <p className="font-body text-xs uppercase tracking-wide text-muted-foreground">Order ID</p>
              <p className="break-anywhere font-display text-xl text-royal sm:text-2xl">{orderId}</p>
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

  // ---- Sign-in gate (before the address form, so nothing is typed in vain) ----
  if (!authLoading && !session) {
    return (
      <div>
        <PageHeader title="Checkout" crumbs={[{ label: 'Cart', to: '/cart' }, { label: 'Checkout' }]} />
        <section className="container-suvadu py-20 text-center">
          <div className="card-surface mx-auto max-w-md px-6 py-14">
            <h2 className="font-display text-3xl text-plum">Please sign in to check out</h2>
            <p className="mt-2 font-body text-sm font-light text-muted-foreground">
              Sign in or create an account to place your order and track it later. Your cart is saved.
            </p>
            <Link to="/account" className="btn-primary btn-lg mt-7">Sign In / Register</Link>
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
          <div className="card-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl text-plum sm:text-2xl">Delivery Address</h2>
              {!editing && <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 font-body text-sm font-medium text-royal hover:underline"><Pen width={14} /> Edit Address</button>}
            </div>

            {editing && savedLoaded && saved.length > 0 && (
              <div className="mt-5">
                <span className="mb-2.5 block font-body text-xs font-medium uppercase tracking-wide text-plum">Saved addresses</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {saved.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => applySavedAddress(a)}
                      aria-pressed={pickedId === a.id}
                      className={cn(
                        'rounded-2xl border p-4 text-left font-body text-sm font-light transition',
                        pickedId === a.id
                          ? 'border-royal bg-lilac/40 text-plum ring-1 ring-royal'
                          : 'border-border text-muted-foreground hover:border-royal/40',
                      )}
                    >
                      <span className="block font-medium text-plum">{a.label || 'Saved address'}</span>
                      <span className="mt-1 block break-anywhere">{a.line}, {a.city}, {a.state} — {a.pincode}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={startNewAddress}
                    aria-pressed={pickedId === null}
                    className={cn(
                      'rounded-2xl border border-dashed p-4 text-left font-body text-sm transition',
                      pickedId === null ? 'border-royal bg-lilac/40 text-plum' : 'border-border text-muted-foreground hover:border-royal/40',
                    )}
                  >
                    <span className="block font-medium text-plum">Use a different address</span>
                    <span className="mt-1 block font-light">Type a new one below.</span>
                  </button>
                </div>
              </div>
            )}

            {editing ? (
              <form onSubmit={saveAddress} className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Full Name" value={form.name} onChange={(v) => set('name', v)} className="sm:col-span-2" />
                <Field label="Email" type="email" value={form.email} onChange={(v) => set('email', v)} />
                <Field label="Mobile Number" type="tel" value={form.mobile} onChange={(v) => set('mobile', v.replace(/\D/g, '').slice(0, 10))} />
                <Field label="Address" value={form.address} onChange={(v) => set('address', v)} className="sm:col-span-2" />
                <Field label="City" value={form.city} onChange={(v) => set('city', v)} />
                <Field label="State" value={form.state} onChange={(v) => set('state', v)} />
                <Field label="Pincode" value={form.pincode} onChange={(v) => set('pincode', v.replace(/\D/g, '').slice(0, 6))} />
                {session && pickedId === null && (
                  <label className="flex items-center gap-2.5 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={saveToBook}
                      onChange={(e) => setSaveToBook(e.target.checked)}
                      className="h-4 w-4 accent-royal"
                    />
                    <span className="font-body text-sm font-light text-muted-foreground">
                      Save this address to my account for next time
                    </span>
                  </label>
                )}
                <div className="sm:col-span-2">
                  <button type="submit" className="btn-primary">Save & Continue</button>
                </div>
              </form>
            ) : (
              <div className="mt-4 break-anywhere font-body text-sm font-light leading-relaxed text-plum/80">
                <p className="font-medium text-plum">{form.name}</p>
                <p>{form.address}, {form.city}, {form.state} — {form.pincode}</p>
                <p>{form.mobile} · {form.email}</p>
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="card-surface p-5 sm:p-6">
            <h2 className="font-display text-xl text-plum sm:text-2xl">Payment</h2>
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
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-body text-sm font-medium text-plum">{item.product.name}</p>
                      <p className="font-body text-xs font-light text-muted-foreground">{item.size}{item.pages ? ` · ${item.pages}p` : ''}{item.ruling ? ` · ${item.ruling}` : ''} · Qty {item.qty}</p>
                      {item.customization && (item.customization.name || item.customization.text) && (
                        <p className="font-body text-xs font-light text-royal">“{item.customization.name || item.customization.text}”</p>
                      )}
                    </div>
                    <p className="shrink-0 font-body text-sm font-medium text-plum">{formatINR(item.unitPrice * item.qty)}</p>
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
