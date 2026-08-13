import { useEffect, useMemo, useState } from 'react'
import { supabase, type ReviewRow } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import Stars from '@/components/Stars'
import { useSeo } from '@/lib/seo'
import { logAdmin } from '@/lib/adminLog'
import { Trash, Pen } from '@/components/Icons'
import { AdminCard, AdminField, AdminInput, StatusBadge } from './ui'

type Filter = 'all' | ReviewRow['status']
const FILTERS: Filter[] = ['all', 'pending', 'approved', 'rejected']

export default function AdminReviews() {
  useSeo('Admin — Reviews', 'Moderate SUVADU customer reviews.')
  const { notify } = useToast()
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('pending')
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState({ author_name: '', rating: '5', text: '', location: '' })

  useEffect(() => {
    let active = true
    supabase.from('reviews').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (!active) return
      setReviews((data as ReviewRow[]) ?? [])
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  const list = useMemo(() => (filter === 'all' ? reviews : reviews.filter((r) => r.status === filter)), [reviews, filter])

  async function setStatus(id: string, status: ReviewRow['status']) {
    const { error } = await supabase.from('reviews').update({ status }).eq('id', id)
    if (error) { notify(error.message); return }
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    logAdmin('review.status', id, { status })
    notify(`Review ${status}`)
  }

  async function remove(id: string) {
    const { error } = await supabase.from('reviews').delete().eq('id', id)
    if (error) { notify(error.message); return }
    setReviews((prev) => prev.filter((r) => r.id !== id))
    notify('Review deleted')
  }

  function openEdit(r: ReviewRow) {
    setForm({ author_name: r.author_name, rating: String(r.rating), text: r.text, location: r.location ?? '' })
    setEditing(r.id)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    const { data, error } = await supabase
      .from('reviews')
      .update({ author_name: form.author_name.trim(), rating: Number(form.rating), text: form.text.trim(), location: form.location.trim() || null })
      .eq('id', editing).select().single()
    if (error) { notify(error.message); return }
    setReviews((prev) => prev.map((r) => (r.id === editing ? (data as ReviewRow) : r)))
    setEditing(null)
    notify('Review updated')
  }

  return (
    <AdminCard
      title={`Total Reviews (${reviews.length})`}
      action={
        <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className="field w-auto cursor-pointer py-1.5">
          {FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      }
    >
      {editing && (
        <form onSubmit={saveEdit} className="mb-6 grid gap-4 rounded-2xl border border-royal/20 bg-lilac/30 p-5">
          <h3 className="font-display text-lg text-plum">Edit review</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AdminInput label="Author" value={form.author_name} onChange={(v) => setForm((f) => ({ ...f, author_name: v }))} />
            <AdminField label="Rating">
              <select className="field cursor-pointer" value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
              </select>
            </AdminField>
            <AdminInput label="Location" value={form.location} onChange={(v) => setForm((f) => ({ ...f, location: v }))} />
          </div>
          <AdminField label="Text">
            <textarea className="field min-h-[70px]" value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} />
          </AdminField>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary">Save</button>
            <button type="button" onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="font-body text-sm font-light text-muted-foreground">Loading…</p>
      ) : list.length === 0 ? (
        <p className="font-body text-sm font-light text-muted-foreground">No {filter !== 'all' ? filter : ''} reviews.</p>
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-display text-base text-plum">{r.author_name}</span>
                  <Stars rating={r.rating} />
                  {r.location && <span className="font-body text-xs font-light text-muted-foreground">{r.location}</span>}
                </div>
                <StatusBadge status={r.status} />
              </div>
              <p className="mt-2 break-anywhere font-body text-sm font-light leading-relaxed text-plum/80">“{r.text}”</p>
              <p className="mt-1 break-anywhere font-body text-[11px] font-light text-muted-foreground">{r.product_id ? `Product: ${r.product_id}` : 'General testimonial'}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 font-body text-sm font-medium">
                {r.status !== 'approved' && <button onClick={() => setStatus(r.id, 'approved')} className="text-emerald-600 hover:underline">Approve</button>}
                {r.status !== 'rejected' && <button onClick={() => setStatus(r.id, 'rejected')} className="text-rose-500 hover:underline">Reject</button>}
                {r.status !== 'pending' && <button onClick={() => setStatus(r.id, 'pending')} className="text-muted-foreground hover:text-royal">Reset</button>}
                <button onClick={() => openEdit(r)} className="inline-flex items-center gap-1 text-royal hover:underline"><Pen width={13} /> Edit</button>
                <button onClick={() => remove(r.id)} className="ml-auto inline-flex items-center gap-1 text-muted-foreground hover:text-rose-500"><Trash width={13} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminCard>
  )
}
