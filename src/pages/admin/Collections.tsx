import { useRef, useState } from 'react'
import { useCatalog, type CollectionInput } from '@/context/CatalogContext'
import { useToast } from '@/components/Toast'
import NotebookCover from '@/components/NotebookCover'
import { type Collection, type Pattern } from '@/data/products'
import { useSeo } from '@/lib/seo'
import { Plus, Pen } from '@/components/Icons'
import { AdminCard, AdminField, AdminInput } from './ui'

const PATTERNS: Pattern[] = ['plain', 'lines', 'dots', 'floral', 'wave', 'mono', 'stars', 'kids']
const EMPTY: CollectionInput = { displayName: '', internalName: '', description: '', accent: '#E6E6FA', pattern: 'plain', image: '' }

// Covers are stored as base64 inside the collections row, so the encoded string
// travels with every catalogue fetch. Cap the picked file, then downscale and
// re-encode before saving so what actually lands in the database stays small.
const MAX_IMAGE_MB = 5
const MAX_EDGE = 900 // px — plenty for the Home card and the admin thumbnail
const JPEG_QUALITY = 0.82

/** Reads a picked file, downscales it to fit MAX_EDGE, and returns a base64
 *  data URL. PNGs with transparency keep their type; everything else becomes
 *  JPEG, which is far smaller once base64-encoded. */
function toCompressedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read failed'))
    reader.onload = () => {
      const src = String(reader.result)
      const img = new Image()
      img.onerror = () => reject(new Error('decode failed'))
      img.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('canvas unavailable'))
        ctx.drawImage(img, 0, 0, w, h)
        const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        resolve(canvas.toDataURL(type, JPEG_QUALITY))
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  })
}

export default function AdminCollections() {
  useSeo('Admin — Collections', 'Manage SUVADU collections.')
  const { collections, addCollection, updateCollection } = useCatalog()
  const { notify } = useToast()
  const [editing, setEditing] = useState<string | null>(null) // null=closed, 'new', or slug
  const [form, setForm] = useState<CollectionInput>(EMPTY)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function clearFileInput() { if (fileRef.current) fileRef.current.value = '' }

  function openAdd() { setForm(EMPTY); clearFileInput(); setEditing('new') }
  function openEdit(c: Collection) {
    setForm({
      displayName: c.displayName,
      internalName: c.internalName,
      description: c.description,
      accent: c.accent,
      pattern: c.pattern,
      image: c.image ?? '',
    })
    clearFileInput()
    setEditing(c.slug)
  }
  function close() { setEditing(null); setForm(EMPTY); clearFileInput() }

  async function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { notify('Please choose an image file.'); clearFileInput(); return }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      notify(`That image is too large — please keep it under ${MAX_IMAGE_MB}MB.`)
      clearFileInput()
      return
    }
    // The base64 string is what gets written to the row, so compress here — the
    // preview below and the saved value are then exactly the same data URL.
    try {
      const dataUrl = await toCompressedDataUrl(file)
      setForm((f) => ({ ...f, image: dataUrl }))
    } catch {
      notify('Could not read that image — please try another file.')
      clearFileInput()
    }
  }

  function removeImage() {
    setForm((f) => ({ ...f, image: '' }))
    clearFileInput()
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = editing === 'new' ? await addCollection(form) : await updateCollection(editing!, form)
    setSaving(false)
    notify(res.message)
    if (res.ok) close()
  }

  return (
    <AdminCard
      title={`Collections (${collections.length})`}
      action={!editing && <button onClick={openAdd} className="btn-primary btn-sm"><Plus width={15} /> Add collection</button>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {collections.map((c) => (
          <div key={c.slug} className="flex items-start gap-3 rounded-2xl border border-border p-4">
            <div className="w-14 shrink-0">
              {c.image ? (
                <img src={c.image} alt="" className="aspect-[3/4] w-full rounded-xl object-cover" />
              ) : (
                <NotebookCover colour={c.accent} pattern={c.pattern} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate font-display text-lg text-plum">{c.displayName}</h3>
                <button onClick={() => openEdit(c)} aria-label="Edit" className="shrink-0 text-muted-foreground hover:text-royal"><Pen width={15} /></button>
              </div>
              <p className="font-body text-xs font-light text-muted-foreground">{c.count} designs · /{c.slug}</p>
              <p className="mt-1 line-clamp-2 font-body text-xs font-light text-plum/70">{c.description}</p>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <form onSubmit={save} className="mt-6 grid gap-4 rounded-2xl border border-royal/20 bg-lilac/30 p-5 sm:grid-cols-2">
          <h3 className="font-display text-lg text-plum sm:col-span-2">{editing === 'new' ? 'New collection' : `Edit “${form.displayName}”`}</h3>
          <AdminInput label="Display name" value={form.displayName} onChange={(v) => setForm((f) => ({ ...f, displayName: v }))} required />
          <AdminInput label="Internal name" value={form.internalName ?? ''} onChange={(v) => setForm((f) => ({ ...f, internalName: v }))} />
          <AdminField label="Description" className="sm:col-span-2">
            <textarea className="field min-h-[70px]" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </AdminField>
          <AdminField label="Accent colour">
            <div className="flex items-center gap-3">
              <input type="color" value={form.accent} onChange={(e) => setForm((f) => ({ ...f, accent: e.target.value }))} className="h-10 w-14 cursor-pointer rounded border border-border bg-white" />
              <input className="field" value={form.accent} onChange={(e) => setForm((f) => ({ ...f, accent: e.target.value }))} />
            </div>
          </AdminField>
          <AdminField label="Cover pattern">
            <select className="field cursor-pointer" value={form.pattern} onChange={(e) => setForm((f) => ({ ...f, pattern: e.target.value as Pattern }))}>
              {PATTERNS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </AdminField>

          <AdminField label="Collection image — optional" className="sm:col-span-2">
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-24 w-[72px] shrink-0 overflow-hidden rounded-xl border border-border bg-white">
                {form.image ? (
                  <img src={form.image} alt="Collection cover preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-lilac/40 p-1 text-center font-body text-[10px] uppercase leading-tight text-muted-foreground">
                    No image
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={onImage}
                  className="block max-w-full font-body text-sm file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-royal file:px-4 file:py-2 file:font-body file:text-xs file:font-medium file:text-white hover:file:bg-royal-700"
                />
                {form.image && (
                  <button type="button" onClick={removeImage} className="font-body text-xs font-medium text-muted-foreground hover:text-rose-500">
                    Remove
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 font-body text-xs font-light text-muted-foreground">
              Shown on the Home page collection card. Stored with the collection itself — large images are resized to {MAX_EDGE}px before saving. Leave empty to keep using the generated cover from the accent colour and pattern. Max {MAX_IMAGE_MB}MB.
            </p>
          </AdminField>
          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : editing === 'new' ? 'Create' : 'Save changes'}</button>
            <button type="button" onClick={close} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}
    </AdminCard>
  )
}
