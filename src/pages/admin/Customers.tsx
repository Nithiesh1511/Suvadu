import { useEffect, useMemo, useState } from 'react'
import { supabase, type ProfileRow, type OrderRow } from '@/lib/supabase'
import { useSeo } from '@/lib/seo'
import { formatINR } from '@/lib/utils'
import { AdminCard, StatusBadge } from './ui'

export default function AdminCustomers() {
  useSeo('Admin — Customers', 'View SUVADU customer accounts.')
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [ordersByUser, setOrdersByUser] = useState<Record<string, OrderRow[]>>({})

  useEffect(() => {
    let active = true
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (!active) return
      setProfiles((data as ProfileRow[]) ?? [])
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return profiles
    return profiles.filter((p) => (p.name ?? '').toLowerCase().includes(query) || (p.email ?? '').toLowerCase().includes(query))
  }, [profiles, q])

  async function expand(id: string) {
    if (open === id) { setOpen(null); return }
    setOpen(id)
    if (!ordersByUser[id]) {
      const { data } = await supabase.from('orders').select('*').eq('user_id', id).order('created_at', { ascending: false })
      setOrdersByUser((prev) => ({ ...prev, [id]: (data as OrderRow[]) ?? [] }))
    }
  }

  return (
    <AdminCard title={`Customers (${profiles.length})`}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="field mb-4 max-w-xs" />
      {loading ? (
        <p className="font-body text-sm font-light text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="font-body text-sm font-light text-muted-foreground">No customers found.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => {
            const isOpen = open === p.id
            const orders = ordersByUser[p.id]
            return (
              <div key={p.id} className="rounded-2xl border border-border">
                <button onClick={() => expand(p.id)} className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left">
                  <div>
                    <span className="font-body text-sm font-medium text-plum">{p.name || '(no name)'}</span>
                    {p.is_admin && <span className="ml-2 rounded-full bg-royal/10 px-2 py-0.5 font-body text-[10px] font-medium uppercase text-royal">Admin</span>}
                    <span className="ml-2 font-body text-xs font-light text-muted-foreground">{p.email}</span>
                  </div>
                  <span className="font-body text-xs font-light text-muted-foreground">{p.mobile || '—'}</span>
                </button>
                {isOpen && (
                  <div className="border-t border-border px-4 py-3">
                    <p className="mb-2 font-body text-xs font-medium uppercase tracking-wide text-muted-foreground">Orders</p>
                    {!orders ? (
                      <p className="font-body text-sm font-light text-muted-foreground">Loading orders…</p>
                    ) : orders.length === 0 ? (
                      <p className="font-body text-sm font-light text-muted-foreground">No orders yet.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {orders.map((o) => (
                          <li key={o.id} className="flex items-center justify-between gap-3 font-body text-sm">
                            <span className="text-plum">{o.order_number} <span className="text-muted-foreground">· {new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></span>
                            <span className="flex items-center gap-3"><span className="font-medium text-plum">{formatINR(Number(o.total))}</span><StatusBadge status={o.status} /></span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </AdminCard>
  )
}
