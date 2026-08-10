import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore, type Customization } from '@/context/StoreContext'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/Toast'
import PageHeader from '@/components/PageHeader'
import NotebookCover from '@/components/NotebookCover'
import ProductImage from '@/components/ProductImage'
import { useCatalog } from '@/context/CatalogContext'
import { supabase } from '@/lib/supabase'
import { COLOURS, type Product, type SizeKey } from '@/data/products'
import { User, Trash, Pen, Heart } from '@/components/Icons'
import { formatINR, cn, isEmail, isMobile } from '@/lib/utils'

type Tab = 'profile' | 'orders' | 'addresses' | 'customizations' | 'wishlist'

interface Address { id: string; label: string; line: string; city: string; state: string; pincode: string }

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
interface OrderItemRecord {
  product_id: string
  product_name: string
  product_slug: string
  size: string
  qty: number
  unit_price: number
  pages: number | null
  customization: Record<string, unknown> | null
}
interface OrderRecord {
  id: string
  order_number: string
  status: OrderStatus
  total: number
  created_at: string
  order_items: OrderItemRecord[]
}

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-amber-100 text-amber-700',
  shipped: 'bg-sky-100 text-sky-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-600',
}
const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Payment pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export default function Account({ tab = 'profile' }: { tab?: Tab }) {
  const { user, wishlist, toggleWishlist, addToCart } = useStore()
  const { signOut } = useAuth()
  const { allProducts: ALL_PRODUCTS } = useCatalog()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [active, setActive] = useState<Tab>(tab)
  useEffect(() => setActive(tab), [tab])

  if (!user) return <AuthGate notify={notify} />

  const wished: Product[] = wishlist.map((id) => ALL_PRODUCTS.find((p) => p.id === id)).filter(Boolean) as Product[]

  const TABS: { key: Tab; label: string }[] = [
    { key: 'profile', label: 'Profile' },
    { key: 'orders', label: 'Orders' },
    { key: 'addresses', label: 'Addresses' },
    { key: 'customizations', label: 'Customizations' },
    { key: 'wishlist', label: `Wishlist (${wished.length})` },
  ]

  return (
    <div>
      <PageHeader eyebrow={`Welcome back, ${user.name.split(' ')[0]}`} title="My Account" crumbs={[{ label: 'Account' }]} />

      <section className="container-suvadu grid gap-10 py-12 lg:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside className="h-fit">
          <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-border bg-white p-2 shadow-card lg:flex-col">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={cn(
                  'whitespace-nowrap rounded-xl px-4 py-2.5 text-left font-body text-sm transition',
                  active === t.key ? 'bg-royal text-white' : 'text-plum/80 hover:bg-lilac',
                )}
              >
                {t.label}
              </button>
            ))}
            <button onClick={async () => { await signOut(); notify('Logged out'); navigate('/') }} className="whitespace-nowrap rounded-xl px-4 py-2.5 text-left font-body text-sm text-rose-500 transition hover:bg-rose-50">
              Logout
            </button>
          </nav>
        </aside>

        {/* Panel */}
        <div className="min-w-0">
          {active === 'profile' && <ProfilePanel />}
          {active === 'orders' && <OrdersPanel />}
          {active === 'addresses' && <AddressesPanel notify={notify} />}
          {active === 'customizations' && <CustomizationsPanel />}
          {active === 'wishlist' && (
            <WishlistPanel
              items={wished}
              onRemove={(id) => { toggleWishlist(id); notify('Removed from wishlist') }}
              onAdd={(p) => { addToCart({ product: p, size: 'A5', unitPrice: p.prices.A5 }); notify(`Added ${p.name} to cart`) }}
            />
          )}
        </div>
      </section>
    </div>
  )
}

/* ---------- Auth ---------- */
function AuthGate({ notify }: { notify: (m: string) => void }) {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    // Client-side guards for clearer feedback than the raw API error.
    if (!isEmail(form.email)) { setError('Please enter a valid email address.'); return }
    if (mode === 'register') {
      if (form.mobile && !isMobile(form.mobile)) { setError('Please enter a valid 10-digit mobile number.'); return }
      if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    }
    setBusy(true)
    const res =
      mode === 'login'
        ? await signIn(form.email.trim(), form.password)
        : await signUp({ name: form.name.trim(), email: form.email.trim(), password: form.password, mobile: form.mobile.trim() })
    setBusy(false)
    if (!res.ok) { setError(res.message); return }
    notify(res.message)
    // On sign-up with email confirmation enabled there's no session yet — bounce
    // the user back to the login tab to sign in after confirming.
    if (res.needsConfirmation) setMode('login')
  }

  return (
    <div>
      <PageHeader title={mode === 'login' ? 'Sign In' : 'Create Account'} crumbs={[{ label: 'Account' }]} />
      <section className="container-suvadu py-16">
        <div className="card-surface mx-auto max-w-md p-7">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-lilac text-royal"><User width={26} /></span>
          <h2 className="mt-5 text-center font-display text-2xl text-plum">{mode === 'login' ? 'Welcome back' : 'Join Suvadu'}</h2>
          <p className="mt-1 text-center font-body text-sm font-light text-muted-foreground">
            {mode === 'login' ? 'Sign in to view orders, wishlist & customizations.' : 'Create an account to save your favourites.'}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'register' && (
              <Input label="Full Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
            )}
            <Input label="Email" type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} required />
            {mode === 'register' && (
              <Input label="Mobile Number" type="tel" value={form.mobile} onChange={(v) => setForm((f) => ({ ...f, mobile: v.replace(/\D/g, '').slice(0, 10) }))} />
            )}
            <Input label="Password" type="password" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} required />
            {error && <p className="font-body text-sm font-medium text-rose-500">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary btn-lg w-full">
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="mt-5 text-center font-body text-sm font-light text-muted-foreground">
            {mode === 'login' ? "Don't have an account? " : 'Already have one? '}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} className="font-medium text-royal hover:underline">
              {mode === 'login' ? 'Register' : 'Sign in'}
            </button>
          </p>
        </div>
      </section>
    </div>
  )
}

/* ---------- Panels ---------- */
function ProfilePanel() {
  const { user } = useStore()
  const { updateProfile } = useAuth()
  const { notify } = useToast()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: user!.name, mobile: user!.mobile })

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (form.mobile && !isMobile(form.mobile)) { notify('Please enter a valid 10-digit mobile number.'); return }
    const res = await updateProfile({ name: form.name, mobile: form.mobile })
    notify(res.message)
    if (res.ok) setEditing(false)
  }

  return (
    <Card title="Profile" action={!editing ? { label: 'Edit Profile', icon: true, onClick: () => setEditing(true) } : undefined}>
      {editing ? (
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Input label="Full Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} className="sm:col-span-2" />
          <Detail label="Email" value={user!.email} />
          <Input label="Mobile" type="tel" value={form.mobile} onChange={(v) => setForm((f) => ({ ...f, mobile: v.replace(/\D/g, '').slice(0, 10) }))} />
          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" className="btn-primary">Save Changes</button>
            <button type="button" onClick={() => { setForm({ name: user!.name, mobile: user!.mobile }); setEditing(false) }} className="btn-ghost">Cancel</button>
          </div>
        </form>
      ) : (
        <dl className="grid gap-5 sm:grid-cols-2">
          <Detail label="Full Name" value={user!.name} />
          <Detail label="Email" value={user!.email} />
          <Detail label="Mobile" value={user!.mobile} />
        </dl>
      )}
    </Card>
  )
}

function OrdersPanel() {
  const { addToCart } = useStore()
  const { allProducts } = useCatalog()
  const { notify } = useToast()
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase
      .from('orders')
      .select('id, order_number, status, total, created_at, order_items(product_id, product_name, product_slug, size, qty, unit_price, pages, customization)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!active) return
        setOrders((data as unknown as OrderRecord[]) ?? [])
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  function reorder(o: OrderRecord) {
    let added = 0
    o.order_items.forEach((it) => {
      const p = allProducts.find((x) => x.id === it.product_id || x.slug === it.product_slug)
      if (p) {
        addToCart({
          product: p,
          size: it.size as SizeKey,
          unitPrice: Number(it.unit_price),
          qty: it.qty,
          pages: it.pages ?? undefined,
          customization: (it.customization as Customization) ?? undefined,
        })
        added++
      }
    })
    notify(added ? 'Order items added to cart' : 'Those products are no longer available.')
  }

  if (loading) {
    return <Card title="Order History"><p className="font-body text-sm font-light text-muted-foreground">Loading your orders…</p></Card>
  }
  if (orders.length === 0) {
    return (
      <Card title="Order History">
        <div className="flex flex-col items-center py-10 text-center">
          <p className="font-display text-xl text-plum">No orders yet</p>
          <p className="mt-1 font-body text-sm font-light text-muted-foreground">When you place an order it’ll appear here.</p>
          <Link to="/collections" className="btn-secondary mt-5">Start Shopping</Link>
        </div>
      </Card>
    )
  }

  return (
    <Card title="Order History">
      <div className="space-y-4">
        {orders.map((o) => {
          const detailSlug = o.order_items[0]?.product_slug
          return (
            <div key={o.id} className="rounded-2xl border border-border p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display text-lg text-plum">{o.order_number}</p>
                  <p className="font-body text-xs font-light text-muted-foreground">
                    Placed {new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className={cn('rounded-full px-3 py-1 font-body text-xs font-medium', STATUS_STYLES[o.status])}>{STATUS_LABEL[o.status]}</span>
              </div>
              <ul className="mt-3 space-y-1 font-body text-sm font-light text-plum/80">
                {o.order_items.map((it, i) => <li key={i}>{it.qty} × {it.product_name} <span className="text-muted-foreground">({it.size})</span></li>)}
              </ul>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="font-body text-sm font-medium text-plum">{formatINR(Number(o.total))}</span>
                <div className="flex gap-3">
                  {detailSlug && <Link to={`/products/${detailSlug}`} className="font-body text-sm font-medium text-royal hover:underline">View Details</Link>}
                  <button onClick={() => reorder(o)} className="font-body text-sm font-medium text-royal hover:underline">Reorder</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

const EMPTY_ADDRESS: Omit<Address, 'id'> = { label: '', line: '', city: '', state: '', pincode: '' }

function AddressesPanel({ notify }: { notify: (m: string) => void }) {
  const [addresses, setAddresses] = useState<Address[]>([
    { id: 'A1', label: 'Home', line: '14 Brigade Road, Ashok Nagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560025' },
  ])
  // null = closed, 'new' = adding, otherwise the id of the address being edited.
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Address, 'id'>>(EMPTY_ADDRESS)

  function openAdd() { setForm(EMPTY_ADDRESS); setEditing('new') }
  function openEdit(a: Address) { setForm({ label: a.label, line: a.line, city: a.city, state: a.state, pincode: a.pincode }); setEditing(a.id) }
  function close() { setEditing(null); setForm(EMPTY_ADDRESS) }

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.line || !/^\d{6}$/.test(form.pincode)) { notify('Enter a valid address and 6-digit pincode.'); return }
    if (editing === 'new') {
      setAddresses((a) => [...a, { ...form, id: 'A' + Date.now() }])
      notify('Address added')
    } else {
      setAddresses((a) => a.map((x) => (x.id === editing ? { ...form, id: x.id } : x)))
      notify('Address updated')
    }
    close()
  }

  return (
    <Card title="Saved Addresses" action={!editing ? { label: 'Add New Address', onClick: openAdd } : undefined}>
      <div className="space-y-4">
        {addresses.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border p-5">
            <div>
              <span className="badge-soft">{a.label || 'Address'}</span>
              <p className="mt-2 font-body text-sm font-light text-plum/80">{a.line}, {a.city}, {a.state} — {a.pincode}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button onClick={() => openEdit(a)} aria-label="Edit address" className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-lilac hover:text-royal"><Pen width={15} /></button>
              <button onClick={() => { setAddresses((p) => p.filter((x) => x.id !== a.id)); if (editing === a.id) close(); notify('Address removed') }} aria-label="Delete address" className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-rose-50 hover:text-rose-500"><Trash width={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <form onSubmit={save} className="mt-5 grid gap-4 rounded-2xl border border-royal/20 bg-lilac/30 p-5 sm:grid-cols-2">
          <Input label="Label (Home/Work)" value={form.label} onChange={(v) => setForm((f) => ({ ...f, label: v }))} />
          <Input label="Pincode" value={form.pincode} onChange={(v) => setForm((f) => ({ ...f, pincode: v.replace(/\D/g, '').slice(0, 6) }))} />
          <Input label="Address" value={form.line} onChange={(v) => setForm((f) => ({ ...f, line: v }))} className="sm:col-span-2" />
          <Input label="City" value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} />
          <Input label="State" value={form.state} onChange={(v) => setForm((f) => ({ ...f, state: v }))} />
          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" className="btn-primary">{editing === 'new' ? 'Save Address' : 'Update Address'}</button>
            <button type="button" onClick={close} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}
    </Card>
  )
}

interface SavedCustomization { label: string; font?: string; colour?: string }
type CustomItemRow = { customization: { name?: string; text?: string; font?: string; colour?: string } | null }

function CustomizationsPanel() {
  const { session } = useAuth()
  const [items, setItems] = useState<SavedCustomization[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    if (!session) { setLoading(false); return }
    // Personalized items from the user's own orders (RLS + inner join scope it
    // to them). Replaces the old hardcoded demo list.
    supabase
      .from('order_items')
      .select('customization, orders!inner(user_id)')
      .eq('orders.user_id', session.user.id)
      .not('customization', 'is', null)
      .then(({ data }) => {
        if (!active) return
        const rows = (data as unknown as CustomItemRow[]) ?? []
        const seen = new Set<string>()
        const list: SavedCustomization[] = []
        for (const r of rows) {
          const c = r.customization
          const label = c?.name || c?.text
          if (!label) continue
          const key = `${label}|${c?.font ?? ''}`
          if (seen.has(key)) continue
          seen.add(key)
          list.push({ label, font: c?.font, colour: c?.colour })
        }
        setItems(list)
        setLoading(false)
      })
    return () => { active = false }
  }, [session])

  if (loading) {
    return <Card title="Saved Customizations"><p className="font-body text-sm font-light text-muted-foreground">Loading…</p></Card>
  }
  if (items.length === 0) {
    return (
      <Card title="Saved Customizations">
        <div className="flex flex-col items-center py-10 text-center">
          <p className="font-display text-xl text-plum">No customizations yet</p>
          <p className="mt-1 font-body text-sm font-light text-muted-foreground">Personalise a notebook and it’ll be saved here for easy reordering.</p>
          <Link to="/special-collections/made-for-you" className="btn-secondary mt-5">Personalise One</Link>
        </div>
      </Card>
    )
  }

  return (
    <Card title="Saved Customizations">
      <div className="grid gap-5 sm:grid-cols-2">
        {items.map((s, i) => {
          const hex = COLOURS.find((c) => c.name === s.colour)?.hex ?? '#E6E6FA'
          return (
            <div key={i} className="flex gap-4 rounded-2xl border border-border p-4">
              <div className="w-16 shrink-0"><NotebookCover colour={hex} pattern="plain" customText={s.label} customFont={s.font} /></div>
              <div className="flex flex-col">
                <p className="font-display text-lg text-plum">“{s.label}”</p>
                {s.font && <p className="font-body text-xs font-light text-muted-foreground">Font: {s.font}</p>}
                {s.colour && <p className="font-body text-xs font-light text-muted-foreground">Colour: {s.colour}</p>}
                <Link to="/special-collections/made-for-you" className="mt-auto font-body text-sm font-medium text-royal hover:underline">Order again →</Link>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function WishlistPanel({ items, onRemove, onAdd }: { items: Product[]; onRemove: (id: string) => void; onAdd: (p: Product) => void }) {
  if (items.length === 0) {
    return (
      <Card title="Wishlist">
        <div className="flex flex-col items-center py-10 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-lilac text-royal"><Heart width={24} /></span>
          <p className="mt-4 font-display text-xl text-plum">No saved items yet</p>
          <p className="mt-1 font-body text-sm font-light text-muted-foreground">Tap the heart on any product to save it here.</p>
          <Link to="/collections" className="btn-secondary mt-5">Browse Collections</Link>
        </div>
      </Card>
    )
  }
  return (
    <Card title="Wishlist">
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((p) => (
          <div key={p.id} className="flex gap-4 rounded-2xl border border-border p-4">
            <Link to={`/products/${p.slug}`} className="w-16 shrink-0"><ProductImage image={p.image} alt={p.name} colour={p.colour.hex} pattern={p.pattern} /></Link>
            <div className="flex flex-1 flex-col">
              <Link to={`/products/${p.slug}`} className="font-display text-lg leading-snug text-plum hover:text-royal">{p.name}</Link>
              <p className="font-body text-sm font-medium text-plum">{formatINR(p.prices.A5)}</p>
              <div className="mt-auto flex items-center gap-3 pt-2">
                <button onClick={() => onAdd(p)} className="btn-primary btn-sm">Add to Cart</button>
                <button onClick={() => onRemove(p.id)} className="font-body text-xs font-medium text-muted-foreground hover:text-rose-500">Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ---------- Small UI helpers ---------- */
function Card({ title, action, children }: { title: string; action?: { label: string; onClick: () => void; icon?: boolean }; children: React.ReactNode }) {
  return (
    <div className="card-surface p-6 sm:p-7">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-2xl text-plum">{title}</h2>
        {action && (
          <button onClick={action.onClick} className="inline-flex items-center gap-1.5 font-body text-sm font-medium text-royal hover:underline">
            {action.icon && <Pen width={14} />}{action.label}
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-body text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-body text-base text-plum">{value}</dd>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', required, className }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; className?: string
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block font-body text-xs font-medium uppercase tracking-wide text-plum">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} className="field" />
    </label>
  )
}
