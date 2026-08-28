import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '@/context/StoreContext'
import { useToast } from '@/components/Toast'
import ProductImage from '@/components/ProductImage'
import PageHeader from '@/components/PageHeader'
import { Plus, Minus, Trash, ArrowRight, Check, Close } from '@/components/Icons'
import { formatINR } from '@/lib/utils'
import { isAccessory } from '@/data/products'

export default function Cart() {
  const { cart, updateQty, removeFromCart, subtotal, discount, total, coupon, applyCoupon, removeCoupon } = useStore()
  const { notify } = useToast()
  const [code, setCode] = useState('')

  const grandTotal = total

  function onApply(e: React.FormEvent) {
    e.preventDefault()
    const res = applyCoupon(code)
    notify(res.message)
    if (res.ok) setCode('')
  }

  if (cart.length === 0) {
    return (
      <div>
        <PageHeader title="Your Cart" crumbs={[{ label: 'Cart' }]} />
        <section className="container-suvadu py-20">
          <div className="card-surface mx-auto flex max-w-lg flex-col items-center px-6 py-16 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-lilac text-royal text-2xl">🛒</span>
            <h2 className="mt-6 font-display text-3xl text-plum">Your cart is empty</h2>
            <p className="mt-2 max-w-sm font-body text-sm font-light text-muted-foreground">
              Beautiful notebooks are waiting. Find the one that’s yours.
            </p>
            <Link to="/collections" className="btn-primary btn-lg mt-7">Start Shopping</Link>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Your Cart" subtitle={`${cart.length} ${cart.length === 1 ? 'item' : 'items'} ready to make their mark.`} crumbs={[{ label: 'Cart' }]} />

      <section className="container-suvadu grid gap-10 py-12 lg:grid-cols-[1.6fr_1fr]">
        {/* Items */}
        <div className="space-y-5">
          {cart.map((item) => {
            // Accessories have no product page — send them back to the shelf
            // they came from rather than to a 404.
            const accessory = isAccessory(item.product.id)
            const to = accessory ? '/accessories' : `/products/${item.product.slug}`
            return (
            <div key={item.key} className="flex gap-3 rounded-2xl border border-border bg-white p-3 shadow-card sm:gap-5 sm:p-4">
              <Link to={to} className="w-16 shrink-0 xs:w-20 sm:w-24">
                <ProductImage
                  image={item.product.image}
                  alt={item.product.name}
                  colour={item.product.colour.hex}
                  pattern={item.product.pattern}
                  customText={item.customization?.name || item.customization?.text}
                  customFont={item.customization?.font}
                />
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="min-w-0">
                    <Link to={to} className="font-display text-base leading-snug text-plum hover:text-royal sm:text-lg">{item.product.name}</Link>
                    <p className="font-body text-xs font-light text-muted-foreground">{item.product.collectionName}{accessory ? '' : ` · Size ${item.size}`}{item.pages ? ` · ${item.pages} pages` : ''}{item.ruling ? ` · ${item.ruling}` : ''}</p>
                    {item.customization && (
                      <ul className="mt-1.5 space-y-0.5 font-body text-xs font-light text-royal">
                        {item.customization.name && <li>Name: “{item.customization.name}”</li>}
                        {item.customization.text && <li>Text: “{item.customization.text}”</li>}
                        {item.customization.font && <li>Font: {item.customization.font}</li>}
                        {item.customization.colour && <li>Colour: {item.customization.colour}</li>}
                      </ul>
                    )}
                  </div>
                  <button onClick={() => removeFromCart(item.key)} aria-label="Remove item" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-rose-50 hover:text-rose-500">
                    <Trash width={17} />
                  </button>
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                  <div className="flex items-center rounded-full border border-border">
                    <button onClick={() => updateQty(item.key, item.qty - 1)} aria-label="Decrease" className="grid h-9 w-9 place-items-center text-plum hover:text-royal"><Minus width={14} /></button>
                    <span className="w-7 text-center font-body text-sm font-medium text-plum">{item.qty}</span>
                    <button onClick={() => updateQty(item.key, item.qty + 1)} aria-label="Increase" className="grid h-9 w-9 place-items-center text-plum hover:text-royal"><Plus width={14} /></button>
                  </div>
                  <p className="font-body text-base font-medium text-plum">{formatINR(item.unitPrice * item.qty)}</p>
                </div>
              </div>
            </div>
            )
          })}

          <Link to="/collections" className="inline-flex items-center gap-1.5 font-body text-sm font-medium text-royal hover:underline">
            ← Continue Shopping
          </Link>
        </div>

        {/* Summary */}
        <aside className="h-fit lg:sticky lg:top-24">
          <div className="card-surface p-6">
            <h2 className="font-display text-2xl text-plum">Order Summary</h2>

            {/* Coupon */}
            <form onSubmit={onApply} className="mt-5">
              <label className="mb-1.5 block font-body text-xs font-medium uppercase tracking-wide text-plum">Apply Coupon</label>
              {coupon ? (
                <div className="flex items-center justify-between rounded-xl border border-royal/30 bg-lilac/50 px-4 py-3">
                  <span className="inline-flex items-center gap-2 font-body text-sm font-medium text-royal">
                    <Check width={15} /> {coupon} applied
                  </span>
                  <button type="button" onClick={() => { removeCoupon(); notify('Coupon removed') }} aria-label="Remove coupon" className="text-muted-foreground hover:text-royal"><Close width={15} /></button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 xs:flex-row">
                  <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code" className="field uppercase" />
                  <button type="submit" className="btn-secondary shrink-0">Apply</button>
                </div>
              )}
              {!coupon && <p className="mt-2 font-body text-xs font-light text-muted-foreground">Try <button type="button" onClick={() => setCode('SUVADU10')} className="text-royal underline">SUVADU10</button> for 10% off.</p>}
            </form>

            <dl className="mt-6 space-y-3 border-t border-border pt-5 font-body text-sm">
              <Row label="Subtotal" value={formatINR(subtotal)} />
              {discount > 0 && <Row label={`Discount (${coupon})`} value={`– ${formatINR(discount)}`} accent />}
            </dl>

            <div className="mt-5 flex items-center justify-between border-t border-border pt-5">
              <span className="font-display text-lg text-plum">Total</span>
              <span className="font-body text-2xl font-medium text-plum">{formatINR(grandTotal)}</span>
            </div>

            <Link to="/checkout" className="btn-primary btn-lg mt-6 w-full">
              Proceed to Checkout <ArrowRight width={17} />
            </Link>
            <p className="mt-3 text-center font-body text-xs font-light text-muted-foreground">Secure payment via Razorpay · UPI, Cards & Net Banking</p>
          </div>
        </aside>
      </section>
    </div>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="font-light text-muted-foreground">{label}</dt>
      <dd className={accent ? 'font-medium text-royal' : 'font-medium text-plum'}>{value}</dd>
    </div>
  )
}
