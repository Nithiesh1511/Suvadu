import { useState } from 'react'
import { useCatalog, type CollectionInput } from '@/context/CatalogContext'
import { useToast } from '@/components/Toast'
import NotebookCover from '@/components/NotebookCover'
import { type Collection, type Pattern } from '@/data/products'
import { useSeo } from '@/lib/seo'
import { Plus, Pen } from '@/components/Icons'
import { AdminCard, AdminField, AdminInput } from './ui'

const PATTERNS: Pattern[] = ['plain', 'lines', 'dots', 'floral', 'wave', 'mono', 'stars', 'kids']
const EMPTY: CollectionInput = { displayName: '', internalName: '', description: '', accent: '#E6E6FA', pattern: 'plain' }

export default function AdminCollections() {
  useSeo('Admin — Collections', 'Manage SUVADU collections.')
  const { collections, addCollection, updateCollection } = useCatalog()
  const { notify } = useToast()
  const [editing, setEditing] = useState<string | null>(null) // null=closed, 'new', or slug
  const [form, setForm] = useState<CollectionInput>(EMPTY)
  const [saving, setSaving] = useState(false)

  function openAdd() { setForm(EMPTY); setEditing('new') }
  function openEdit(c: Collection) {
    setForm({ displayName: c.displayName, internalName: c.internalName, description: c.description, accent: c.accent, pattern: c.pattern })
    setEditing(c.slug)
  }
  function close() { setEditing(null); setForm(EMPTY) }

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
            <div className="w-14 shrink-0"><NotebookCover colour={c.accent} pattern={c.pattern} /></div>
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
          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : editing === 'new' ? 'Create' : 'Save changes'}</button>
            <button type="button" onClick={close} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}
    </AdminCard>
  )
}
