import { useEffect, useMemo, useState } from 'react'
import { supabase, type ContactRequestRow } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { useSeo } from '@/lib/seo'
import { AdminCard, StatusBadge } from './ui'

export default function AdminContactRequests() {
  useSeo('Admin — Contact Requests', 'View and resolve contact form submissions.')
  const { notify } = useToast()
  const [rows, setRows] = useState<ContactRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'new' | 'resolved'>('all')

  useEffect(() => {
    let active = true
    supabase.from('contact_requests').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (!active) return
      setRows((data as ContactRequestRow[]) ?? [])
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  const list = useMemo(() => (filter === 'all' ? rows : rows.filter((r) => r.status === filter)), [rows, filter])

  async function setStatus(id: string, status: 'new' | 'resolved') {
    const { error } = await supabase.from('contact_requests').update({ status }).eq('id', id)
    if (error) { notify(error.message); return }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    notify(status === 'resolved' ? 'Marked resolved' : 'Reopened')
  }

  return (
    <AdminCard
      title={`Contact Requests (${rows.length})`}
      action={
        <select value={filter} onChange={(e) => setFilter(e.target.value as 'all' | 'new' | 'resolved')} className="field cursor-pointer py-1.5 text-sm">
          <option value="all">All</option>
          <option value="new">New</option>
          <option value="resolved">Resolved</option>
        </select>
      }
    >
      {loading ? (
        <p className="font-body text-sm font-light text-muted-foreground">Loading…</p>
      ) : list.length === 0 ? (
        <p className="font-body text-sm font-light text-muted-foreground">No {filter !== 'all' ? filter : ''} requests.</p>
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-display text-base text-plum">{r.name}</span>
                  <span className="ml-2 font-body text-xs font-light text-muted-foreground">{new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <p className="mt-1 font-body text-xs text-muted-foreground">
                <a href={`mailto:${r.email}`} className="text-royal hover:underline">{r.email}</a>{r.phone ? ` · ${r.phone}` : ''}
              </p>
              <p className="mt-2 font-body text-sm font-light leading-relaxed text-plum/80">{r.message}</p>
              <div className="mt-3 border-t border-border pt-3">
                {r.status === 'new' ? (
                  <button onClick={() => setStatus(r.id, 'resolved')} className="font-body text-sm font-medium text-royal hover:underline">Mark resolved</button>
                ) : (
                  <button onClick={() => setStatus(r.id, 'new')} className="font-body text-sm font-medium text-muted-foreground hover:text-royal">Reopen</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminCard>
  )
}
