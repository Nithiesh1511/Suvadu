import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '@/components/PageHeader'
import ProductImage from '@/components/ProductImage'
import { useToast } from '@/components/Toast'
import { useCatalog, type ProductInput } from '@/context/CatalogContext'
import { type ProductType } from '@/data/products'
import { useAdminAuth } from '@/lib/adminAuth'
import { useSeo } from '@/lib/seo'
import { cn } from '@/lib/utils'
import { Trash, Plus, Check } from '@/components/Icons'

const TYPES: { key: ProductType; label: string; a5: number; a4: number }[] = [
  { key: 'basic', label: 'Basic Notebook', a5: 299, a4: 399 },
  { key: 'customized', label: 'Customized Notebook', a5: 399, a4: 499 },
  { key: 'set', label: 'Matching Set (x2)', a5: 599, a4: 799 },
]

const emptyForm = {
  name: '',
  collectionSlug: '',
  type: 'basic' as ProductType,
  priceA5: '299',
  priceA4: '399',
  description: '',
  image: '',
  bestseller: false,
  isNew: true,
}

export default function Admin() {
  const { isAuthed, login, logout } = useAdminAuth()
  if (!isAuthed) return <AdminLogin onLogin={login} />
  return <AdminConsole onLogout={logout} />
}

function AdminConsole({ onLogout }: { onLogout: () => void }) {
  useSeo('Admin — Add Product', 'Internal admin console to add SUVADU products and bind them to collections.')
  const { collections, customProducts, addProduct, deleteProduct } = useCatalog()
  const { notify } = useToast()
  const [form, setForm] = useState({ ...emptyForm, collectionSlug: collections[0]?.slug ?? '' })
  const fileRef = useRef<HTMLInputElement>(null)

  const collection = collections.find((c) => c.slug === form.collectionSlug)

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function onTypeChange(type: ProductType) {
    const preset = TYPES.find((t) => t.key === type)!
    setForm((f) => ({ ...f, type, priceA5: String(preset.a5), priceA4: String(preset.a4) }))
  }

  function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      notify('Please choose an image file.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => set('image', String(reader.result))
    reader.readAsDataURL(file)
  }

  function clearImage() {
    set('image', '')
    if (fileRef.current) fileRef.current.value = ''
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const input: ProductInput = {
      name: form.name,
      collectionSlug: form.collectionSlug,
      type: form.type,
      priceA5: Number(form.priceA5),
      priceA4: form.priceA4.trim() ? Number(form.priceA4) : null,
      description: form.description,
      image: form.image,
      bestseller: form.bestseller,
      isNew: form.isNew,
    }
    const res = addProduct(input)
    notify(res.message)
    if (res.ok) {
      setForm({ ...emptyForm, collectionSlug: collections[0]?.slug ?? '' })
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Admin Console"
        title="Add a Product"
        subtitle="Create a product and bind it to a collection. It appears instantly across the store — collection pages, search, related products and best sellers."
        crumbs={[{ label: 'Admin' }]}
      />

      <div className="container-suvadu flex justify-end pt-6">
        <button type="button" onClick={onLogout} className="font-body text-sm font-medium text-muted-foreground hover:text-rose-500">
          Sign out
        </button>
      </div>

      <section className="container-suvadu grid gap-10 py-12 lg:grid-cols-[1.4fr_1fr]">
        {/* ---- Form ---- */}
        <form onSubmit={submit} className="card-surface p-6 sm:p-7">
          <h2 className="font-display text-2xl text-plum">Product details</h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="Product name" className="sm:col-span-2">
              <input className="field" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Serene Calm Notebook" required />
            </Field>

            <Field label="Collection">
              <select className="field cursor-pointer" value={form.collectionSlug} onChange={(e) => set('collectionSlug', e.target.value)}>
                {collections.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.displayName}</option>
                ))}
              </select>
            </Field>

            <Field label="Product type">
              <select className="field cursor-pointer" value={form.type} onChange={(e) => onTypeChange(e.target.value as ProductType)}>
                {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </Field>

            <Field label="A5 price (₹)">
              <input className="field" type="number" min="1" value={form.priceA5} onChange={(e) => set('priceA5', e.target.value)} required />
            </Field>

            <Field label="A4 price (₹) — optional">
              <input className="field" type="number" min="0" value={form.priceA4} onChange={(e) => set('priceA4', e.target.value)} placeholder="Leave blank if N/A" />
            </Field>

            <Field label="Product image" className="sm:col-span-2">
              <div className="flex items-center gap-4">
                <div className="h-24 w-[72px] shrink-0 overflow-hidden rounded-xl border border-border bg-cream/40">
                  {form.image ? (
                    <img src={form.image} alt="Product cover preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center font-body text-[10px] uppercase tracking-wide text-muted-foreground">No image</div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <input ref={fileRef} type="file" accept="image/*" onChange={onImage} className="block max-w-full text-sm font-body file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-royal file:px-4 file:py-2 file:font-body file:text-xs file:font-medium file:text-white hover:file:bg-royal/90" />
                  {form.image && (
                    <button type="button" onClick={clearImage} className="font-body text-xs font-medium text-muted-foreground hover:text-rose-500">Remove</button>
                  )}
                </div>
              </div>
            </Field>

            <Field label="Description" className="sm:col-span-2">
              <textarea className="field min-h-[80px]" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Short product description shown on the product page." />
            </Field>

            <div className="flex flex-wrap gap-5 sm:col-span-2">
              <Toggle checked={form.bestseller} onChange={(v) => set('bestseller', v)} label="Mark as Best Seller" />
              <Toggle checked={form.isNew} onChange={(v) => set('isNew', v)} label="Mark as New" />
            </div>
          </div>

          <button type="submit" className="btn-primary btn-lg mt-7 w-full sm:w-auto">
            <Plus width={16} /> Add Product
          </button>
        </form>

        {/* ---- Live preview ---- */}
        <aside className="h-fit lg:sticky lg:top-24">
          <div className="card-surface p-6">
            <h2 className="font-display text-2xl text-plum">Live preview</h2>
            <div className="mx-auto mt-5 w-44">
              <ProductImage image={form.image} alt={form.name} colour={collection?.accent ?? '#E6E6FA'} pattern={collection?.pattern ?? 'plain'} label={collection?.displayName} />
            </div>
            <div className="mt-5 text-center">
              <p className="font-display text-xl text-plum">{form.name || 'Product name'}</p>
              <p className="mt-1 font-body text-sm font-light text-muted-foreground">
                {collection?.displayName}
              </p>
              <p className="mt-2 font-body text-base font-medium text-royal">₹{form.priceA5 || '—'}</p>
            </div>
          </div>
        </aside>
      </section>

      {/* ---- Added products ---- */}
      <section className="container-suvadu pb-20">
        <h2 className="font-display text-3xl text-plum">Products you’ve added <span className="font-body text-base font-light text-muted-foreground">({customProducts.length})</span></h2>
        {customProducts.length === 0 ? (
          <p className="mt-4 font-body text-sm font-light text-muted-foreground">
            None yet. Add your first product above — it’ll show here and in its collection straight away.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customProducts.map((p) => (
              <div key={p.id} className="flex gap-4 rounded-2xl border border-border bg-white p-4 shadow-card">
                <Link to={`/products/${p.slug}`} className="w-16 shrink-0"><ProductImage image={p.image} alt={p.name} colour={p.colour.hex} pattern={p.pattern} /></Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link to={`/products/${p.slug}`} className="truncate font-display text-lg text-plum hover:text-royal">{p.name}</Link>
                  <p className="font-body text-xs font-light text-muted-foreground">
                    {p.collectionName} · ₹{p.prices.A5}
                    {p.bestseller && <span className="ml-1 text-royal">· Bestseller</span>}
                  </p>
                  <div className="mt-auto flex items-center gap-3 pt-2">
                    <Link to={`/collections/${p.collectionSlug}`} className="font-body text-xs font-medium text-royal hover:underline">View in collection</Link>
                    <button
                      onClick={() => { deleteProduct(p.id); notify(`Removed “${p.name}”`) }}
                      className="ml-auto inline-flex items-center gap-1 font-body text-xs font-medium text-muted-foreground hover:text-rose-500"
                    >
                      <Trash width={13} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function AdminLogin({ onLogin }: { onLogin: (username: string, password: string) => boolean }) {
  useSeo('Admin — Sign in', 'Sign in to the SUVADU admin console.')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!onLogin(username, password)) {
      setError('Incorrect username or password.')
      setPassword('')
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Admin Console"
        title="Sign in"
        subtitle="Enter your admin credentials to manage the SUVADU catalogue."
        crumbs={[{ label: 'Admin' }]}
      />

      <section className="container-suvadu py-12">
        <form onSubmit={submit} className="card-surface mx-auto max-w-md p-6 sm:p-7">
          <h2 className="font-display text-2xl text-plum">Admin sign in</h2>

          <div className="mt-5 grid gap-5">
            <Field label="Username">
              <input
                className="field"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError('') }}
                autoComplete="username"
                autoFocus
                required
              />
            </Field>

            <Field label="Password">
              <input
                className="field"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                autoComplete="current-password"
                required
              />
            </Field>

            {error && <p className="font-body text-sm font-medium text-rose-500">{error}</p>}
          </div>

          <button type="submit" className="btn-primary btn-lg mt-7 w-full">Sign in</button>
        </form>
      </section>
    </div>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block font-body text-xs font-medium uppercase tracking-wide text-plum">{label}</span>
      {children}
    </label>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="inline-flex items-center gap-2.5">
      <span className={cn('grid h-5 w-5 place-items-center rounded-md border transition', checked ? 'border-royal bg-royal text-white' : 'border-border bg-white')}>
        {checked && <Check width={13} />}
      </span>
      <span className="font-body text-sm text-plum">{label}</span>
    </button>
  )
}
