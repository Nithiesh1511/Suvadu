import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCatalog, type ProductInput } from '@/context/CatalogContext'
import { useToast } from '@/components/Toast'
import ProductImage from '@/components/ProductImage'
import { type ProductType } from '@/data/products'
import { useSeo } from '@/lib/seo'
import { Plus } from '@/components/Icons'
import { AdminCard, AdminField, AdminToggle } from './ui'

const TYPES: { key: ProductType; label: string; a5: number; a4: number }[] = [
  { key: 'basic', label: 'Suvadu Notebook', a5: 299, a4: 399 },
  { key: 'customized', label: 'Customized Notebook', a5: 399, a4: 499 },
  { key: 'set', label: 'Matching Set (x2)', a5: 599, a4: 799 },
]

const empty = {
  name: '', collectionSlug: '', type: 'basic' as ProductType,
  priceA5: '299', priceA4: '399', priceCustom: '',
  description: '', image: '', bestseller: false, isNew: true,
  stock: '', // blank = not tracked (unlimited)
}

export default function ProductForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  useSeo(isEdit ? 'Admin — Edit product' : 'Admin — Add product', 'Manage a SUVADU product.')
  const { collections, allProducts, addProduct, updateProduct } = useCatalog()
  const { notify } = useToast()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ...empty, collectionSlug: collections[0]?.slug ?? '' })

  const existing = useMemo(() => (id ? allProducts.find((p) => p.id === id) : undefined), [id, allProducts])

  // Prefill when editing (product/collections load async).
  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        collectionSlug: existing.collectionSlug,
        type: existing.type,
        priceA5: String(existing.prices.A5 ?? ''),
        priceA4: existing.prices.A4 == null ? '' : String(existing.prices.A4),
        priceCustom: existing.prices.Custom == null ? '' : String(existing.prices.Custom),
        description: existing.description,
        image: existing.image ?? '',
        bestseller: Boolean(existing.bestseller),
        isNew: Boolean(existing.isNew),
        stock: existing.stock == null ? '' : String(existing.stock),
      })
    } else if (!isEdit && !form.collectionSlug && collections[0]) {
      setForm((f) => ({ ...f, collectionSlug: collections[0].slug }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, collections])

  const collection = collections.find((c) => c.slug === form.collectionSlug)

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) { setForm((f) => ({ ...f, [k]: v })) }

  function onType(type: ProductType) {
    const preset = TYPES.find((t) => t.key === type)!
    // Only auto-fill prices when creating (don't clobber an edit).
    if (isEdit) set('type', type)
    else setForm((f) => ({ ...f, type, priceA5: String(preset.a5), priceA4: String(preset.a4) }))
  }

  function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { notify('Please choose an image file.'); return }
    const reader = new FileReader()
    reader.onload = () => set('image', String(reader.result))
    reader.readAsDataURL(file)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const input: ProductInput = {
      name: form.name,
      collectionSlug: form.collectionSlug,
      type: form.type,
      priceA5: Number(form.priceA5),
      priceA4: form.priceA4.trim() ? Number(form.priceA4) : null,
      priceCustom: form.priceCustom.trim() ? Number(form.priceCustom) : null,
      description: form.description,
      image: form.image,
      bestseller: form.bestseller,
      isNew: form.isNew,
      stock: form.stock.trim() === '' ? null : Math.max(0, Math.floor(Number(form.stock))),
    }
    setSaving(true)
    const res = isEdit ? await updateProduct(id!, input) : await addProduct(input)
    setSaving(false)
    notify(res.message)
    if (res.ok) navigate('/admin/products')
  }

  if (isEdit && !existing) {
    return <AdminCard title="Edit product"><p className="font-body text-sm font-light text-muted-foreground">Loading…</p></AdminCard>
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <AdminCard title={isEdit ? 'Edit product' : 'Add product'}>
        <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
          <AdminField label="Product name" className="sm:col-span-2">
            <input className="field" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Serene Calm Notebook" required />
          </AdminField>

          <AdminField label="Collection">
            <select className="field cursor-pointer" value={form.collectionSlug} onChange={(e) => set('collectionSlug', e.target.value)}>
              {collections.map((c) => <option key={c.slug} value={c.slug}>{c.displayName}</option>)}
            </select>
          </AdminField>

          <AdminField label="Product type">
            <select className="field cursor-pointer" value={form.type} onChange={(e) => onType(e.target.value as ProductType)}>
              {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </AdminField>

          <AdminField label="A5 price (₹)">
            <input className="field" type="number" min="1" value={form.priceA5} onChange={(e) => set('priceA5', e.target.value)} required />
          </AdminField>

          <AdminField label="A4 price (₹) — optional">
            <input className="field" type="number" min="0" value={form.priceA4} onChange={(e) => set('priceA4', e.target.value)} placeholder="Leave blank if N/A" />
          </AdminField>

          <AdminField label="Custom price (₹) — optional">
            <input className="field" type="number" min="0" value={form.priceCustom} onChange={(e) => set('priceCustom', e.target.value)} placeholder="Leave blank = priced on request" />
          </AdminField>

          <AdminField label="Stock — optional">
            <input className="field" type="number" min="0" step="1" value={form.stock} onChange={(e) => set('stock', e.target.value)} placeholder="Leave blank = not tracked" />
          </AdminField>

          <AdminField label="Product image" className="sm:col-span-2">
            <div className="flex items-center gap-4">
              <div className="h-24 w-[72px] shrink-0 overflow-hidden rounded-xl border border-border bg-cream/40">
                {form.image ? <img src={form.image} alt="Preview" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center font-body text-[10px] uppercase text-muted-foreground">No image</div>}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input ref={fileRef} type="file" accept="image/*" onChange={onImage} className="block max-w-full text-sm font-body file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-royal file:px-4 file:py-2 file:font-body file:text-xs file:font-medium file:text-white hover:file:bg-royal/90" />
                {form.image && <button type="button" onClick={() => { set('image', ''); if (fileRef.current) fileRef.current.value = '' }} className="font-body text-xs font-medium text-muted-foreground hover:text-rose-500">Remove</button>}
              </div>
            </div>
          </AdminField>

          <AdminField label="Description" className="sm:col-span-2">
            <textarea className="field min-h-[80px]" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Short product description." />
          </AdminField>

          <div className="flex flex-wrap gap-5 sm:col-span-2">
            <AdminToggle checked={form.bestseller} onChange={(v) => set('bestseller', v)} label="Best Seller" />
            <AdminToggle checked={form.isNew} onChange={(v) => set('isNew', v)} label="New" />
          </div>

          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" disabled={saving} className="btn-primary">{!isEdit && <Plus width={15} />} {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add product'}</button>
            <Link to="/admin/products" className="btn-ghost">Cancel</Link>
          </div>
        </form>
      </AdminCard>

      <aside className="h-fit lg:sticky lg:top-24">
        <AdminCard title="Live preview">
          <div className="mx-auto w-44"><ProductImage image={form.image} alt={form.name} colour={collection?.accent ?? '#E6E6FA'} pattern={collection?.pattern ?? 'plain'} label={collection?.displayName} /></div>
          <div className="mt-4 text-center">
            <p className="font-display text-xl text-plum">{form.name || 'Product name'}</p>
            <p className="mt-1 font-body text-sm font-light text-muted-foreground">{collection?.displayName}</p>
            <p className="mt-2 font-body text-base font-medium text-royal">₹{form.priceA5 || '—'}</p>
          </div>
        </AdminCard>
      </aside>
    </div>
  )
}
