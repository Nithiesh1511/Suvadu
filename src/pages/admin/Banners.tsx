import { useEffect, useRef, useState } from 'react'
import { supabase, type BannerRow } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { useSeo } from '@/lib/seo'
import { Plus, Trash, Pen } from '@/components/Icons'
import { AdminCard, AdminField, AdminInput, AdminToggle, StatusBadge } from './ui'

const BUCKET = 'product-images' // reuse the public bucket, under a banners/ prefix
const EMPTY = { title: '', subtitle: '', link: '', active: true }

async function uploadBannerImage(id: string, file: File): Promise<string> {
  const ext = (file.type.split('/')[1] || 'png').split('+')[0]
  const path = `banners/${id}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export default function AdminBanners() {
  useSeo('Admin — Banners', 'Manage SUVADU promotional banners.')
  const { notify } = useToast()
  const [banners, setBanners] = useState<BannerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null) // null | 'new' | id
  const [form, setForm] = useState(EMPTY)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    supabase.from('banners').select('*').order('sort_order').then(({ data }) => {
      if (!active) return
      setBanners((data as BannerRow[]) ?? [])
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  function openAdd() { setForm(EMPTY); setFile(null); setPreview(''); setEditing('new') }
  function openEdit(b: BannerRow) {
    setForm({ title: b.title, subtitle: b.subtitle, link: b.link ?? '', active: b.active })
    setFile(null); setPreview(b.image_url ?? ''); setEditing(b.id)
  }
  function close() { setEditing(null); setForm(EMPTY); setFile(null); setPreview(''); if (fileRef.current) fileRef.current.value = '' }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) { notify('Please choose an image file.'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing === 'new') {
        const { data, error } = await supabase
          .from('banners')
          .insert({ ...form, link: form.link || null, sort_order: banners.length })
          .select().single()
        if (error) throw error
        let row = data as BannerRow
        if (file) {
          const url = await uploadBannerImage(row.id, file)
          const { data: upd } = await supabase.from('banners').update({ image_url: url }).eq('id', row.id).select().single()
          if (upd) row = upd as BannerRow
        }
        setBanners((prev) => [...prev, row])
      } else {
        const patch: Partial<BannerRow> = { title: form.title, subtitle: form.subtitle, link: form.link || null, active: form.active }
        if (file) patch.image_url = await uploadBannerImage(editing!, file)
        const { data, error } = await supabase.from('banners').update(patch).eq('id', editing).select().single()
        if (error) throw error
        setBanners((prev) => prev.map((b) => (b.id === editing ? (data as BannerRow) : b)))
      }
      notify('Banner saved.')
      close()
    } catch (err) {
      notify(`Save failed: ${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  async function toggle(b: BannerRow) {
    const { error } = await supabase.from('banners').update({ active: !b.active }).eq('id', b.id)
    if (error) { notify(error.message); return }
    setBanners((prev) => prev.map((x) => (x.id === b.id ? { ...x, active: !x.active } : x)))
  }

  async function remove(id: string) {
    const { error } = await supabase.from('banners').delete().eq('id', id)
    if (error) { notify(error.message); return }
    setBanners((prev) => prev.filter((b) => b.id !== id))
    notify('Banner removed.')
  }

  return (
    <AdminCard
      title={`Banners (${banners.length})`}
      action={!editing && <button onClick={openAdd} className="btn-primary btn-sm"><Plus width={15} /> Add banner</button>}
    >
      {editing && (
        <form onSubmit={save} className="mb-6 grid gap-4 rounded-2xl border border-royal/20 bg-lilac/30 p-5">
          <h3 className="font-display text-lg text-plum">{editing === 'new' ? 'New banner' : 'Edit banner'}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminInput label="Title" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} />
            <AdminInput label="Link (optional)" value={form.link} onChange={(v) => setForm((f) => ({ ...f, link: v }))} placeholder="/collections" />
          </div>
          <AdminInput label="Subtitle" value={form.subtitle} onChange={(v) => setForm((f) => ({ ...f, subtitle: v }))} />
          <AdminField label="Image">
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-cream/40">
                {preview ? <img src={preview} alt="Preview" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center font-body text-[10px] uppercase text-muted-foreground">No image</div>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="block max-w-full text-sm font-body file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-royal file:px-4 file:py-2 file:text-xs file:font-medium file:text-white" />
            </div>
          </AdminField>
          <AdminToggle checked={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} label="Active" />
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save banner'}</button>
            <button type="button" onClick={close} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="font-body text-sm font-light text-muted-foreground">Loading…</p>
      ) : banners.length === 0 ? (
        <p className="font-body text-sm font-light text-muted-foreground">No banners yet. Add one to show a promo on the home page.</p>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-border p-3">
              <div className="h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-lilac/40">
                {b.image_url && <img src={b.image_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate font-body text-sm font-medium text-plum">{b.title || '(untitled)'}</p>
                <p className="truncate font-body text-xs font-light text-muted-foreground">{b.subtitle}</p>
              </div>
              {/* The controls travel together to the next line rather than
                  wrapping one at a time and leaving orphaned icons. */}
              <div className="flex items-center gap-4">
                <StatusBadge status={b.active ? 'active' : 'inactive'} />
                <button onClick={() => toggle(b)} className="font-body text-xs font-medium text-royal hover:underline">{b.active ? 'Hide' : 'Show'}</button>
                <button onClick={() => openEdit(b)} aria-label="Edit" className="text-muted-foreground hover:text-royal"><Pen width={15} /></button>
                <button onClick={() => remove(b.id)} aria-label="Delete" className="text-muted-foreground hover:text-rose-500"><Trash width={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminCard>
  )
}
