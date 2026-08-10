import { useEffect, useMemo, useState } from 'react'
import { supabase, type FaqRow } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { useSeo } from '@/lib/seo'
import { Plus, Trash, Pen, ChevronDown } from '@/components/Icons'
import { AdminCard, AdminField, AdminInput } from './ui'

const KNOWN_CATEGORIES = ['Shipping', 'Customization', 'Returns', 'Payments', 'Orders']
const EMPTY = { category: 'Shipping', question: '', answer: '' }

export default function AdminFaqs() {
  useSeo('Admin — FAQ', 'Manage SUVADU FAQ content.')
  const { notify } = useToast()
  const [faqs, setFaqs] = useState<FaqRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null) // null | 'new' | id
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    supabase.from('faqs').select('*').order('category').order('sort_order').then(({ data }) => {
      if (!active) return
      setFaqs((data as FaqRow[]) ?? [])
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  const grouped = useMemo(() => {
    const m = new Map<string, FaqRow[]>()
    for (const f of faqs) { if (!m.has(f.category)) m.set(f.category, []); m.get(f.category)!.push(f) }
    return [...m.entries()]
  }, [faqs])

  const categories = useMemo(() => Array.from(new Set([...KNOWN_CATEGORIES, ...faqs.map((f) => f.category)])), [faqs])

  function openAdd() { setForm(EMPTY); setEditing('new') }
  function openEdit(f: FaqRow) { setForm({ category: f.category, question: f.question, answer: f.answer }); setEditing(f.id) }
  function close() { setEditing(null); setForm(EMPTY) }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.question.trim() || !form.answer.trim()) { notify('Enter a question and answer.'); return }
    setSaving(true)
    if (editing === 'new') {
      const sameCat = faqs.filter((f) => f.category === form.category).length
      const { data, error } = await supabase.from('faqs').insert({ ...form, sort_order: sameCat }).select().single()
      setSaving(false)
      if (error) { notify(error.message); return }
      setFaqs((prev) => [...prev, data as FaqRow])
    } else {
      const { data, error } = await supabase.from('faqs').update(form).eq('id', editing).select().single()
      setSaving(false)
      if (error) { notify(error.message); return }
      setFaqs((prev) => prev.map((f) => (f.id === editing ? (data as FaqRow) : f)))
    }
    notify('FAQ saved.')
    close()
  }

  async function remove(id: string) {
    const { error } = await supabase.from('faqs').delete().eq('id', id)
    if (error) { notify(error.message); return }
    setFaqs((prev) => prev.filter((f) => f.id !== id))
    notify('FAQ removed.')
  }

  async function move(f: FaqRow, dir: -1 | 1) {
    const siblings = faqs.filter((x) => x.category === f.category).sort((a, b) => a.sort_order - b.sort_order)
    const i = siblings.findIndex((x) => x.id === f.id)
    const j = i + dir
    if (j < 0 || j >= siblings.length) return
    const a = siblings[i], b = siblings[j]
    // swap sort_order
    await Promise.all([
      supabase.from('faqs').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('faqs').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    setFaqs((prev) => prev.map((x) => (x.id === a.id ? { ...x, sort_order: b.sort_order } : x.id === b.id ? { ...x, sort_order: a.sort_order } : x)))
  }

  return (
    <AdminCard
      title={`FAQ (${faqs.length})`}
      action={!editing && <button onClick={openAdd} className="btn-primary btn-sm"><Plus width={15} /> Add FAQ</button>}
    >
      {editing && (
        <form onSubmit={save} className="mb-6 grid gap-4 rounded-2xl border border-royal/20 bg-lilac/30 p-5">
          <h3 className="font-display text-lg text-plum">{editing === 'new' ? 'New FAQ' : 'Edit FAQ'}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Category">
              <input list="faq-cats" className="field" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
              <datalist id="faq-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </AdminField>
            <AdminInput label="Question" value={form.question} onChange={(v) => setForm((f) => ({ ...f, question: v }))} />
          </div>
          <AdminField label="Answer">
            <textarea className="field min-h-[80px]" value={form.answer} onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))} />
          </AdminField>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
            <button type="button" onClick={close} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="font-body text-sm font-light text-muted-foreground">Loading…</p>
      ) : faqs.length === 0 ? (
        <p className="font-body text-sm font-light text-muted-foreground">No FAQ entries yet.</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([cat, items]) => (
            <div key={cat}>
              <h3 className="mb-2 font-body text-xs font-medium uppercase tracking-wide text-royal">{cat}</h3>
              <div className="space-y-2">
                {items.map((f, i) => (
                  <div key={f.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
                    <div className="flex flex-col">
                      <button onClick={() => move(f, -1)} disabled={i === 0} aria-label="Move up" className="text-muted-foreground hover:text-royal disabled:opacity-30"><ChevronDown width={14} className="rotate-180" /></button>
                      <button onClick={() => move(f, 1)} disabled={i === items.length - 1} aria-label="Move down" className="text-muted-foreground hover:text-royal disabled:opacity-30"><ChevronDown width={14} /></button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-sm font-medium text-plum">{f.question}</p>
                      <p className="mt-0.5 line-clamp-2 font-body text-xs font-light text-muted-foreground">{f.answer}</p>
                    </div>
                    <button onClick={() => openEdit(f)} aria-label="Edit" className="text-muted-foreground hover:text-royal"><Pen width={14} /></button>
                    <button onClick={() => remove(f.id)} aria-label="Delete" className="text-muted-foreground hover:text-rose-500"><Trash width={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminCard>
  )
}
