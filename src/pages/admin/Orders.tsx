import { useEffect, useMemo, useState } from 'react'
import { supabase, type OrderRow, type OrderItemRow } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { useSeo } from '@/lib/seo'
import { logAdmin } from '@/lib/adminLog'
import { formatINR, cn } from '@/lib/utils'
import { AdminCard, StatusBadge } from './ui'

type OrderStatus = OrderRow['status']
const STATUSES: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
type OrderWithItems = OrderRow & { order_items: OrderItemRow[] }

export default function AdminOrders() {
  useSeo('Admin — Orders', 'Manage SUVADU orders.')
  const { notify } = useToast()
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | OrderStatus>('all')
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!active) return
        setOrders((data as unknown as OrderWithItems[]) ?? [])
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  const rows = useMemo(() => (filter === 'all' ? orders : orders.filter((o) => o.status === filter)), [orders, filter])

  async function setStatus(id: string, status: OrderStatus) {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id)
    if (error) { notify(`Update failed: ${error.message}`); return }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)))
    logAdmin('order.status', id, { status })
    notify(`Order marked ${status}`)
  }

  return (
    <AdminCard
      title={`Orders (${orders.length})`}
      action={
        <select value={filter} onChange={(e) => setFilter(e.target.value as 'all' | OrderStatus)} className="field w-auto cursor-pointer py-1.5">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      }
    >
      {loading ? (
        <p className="font-body text-sm font-light text-muted-foreground">Loading orders…</p>
      ) : rows.length === 0 ? (
        <p className="font-body text-sm font-light text-muted-foreground">No orders{filter !== 'all' ? ` with status “${filter}”` : ''} yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((o) => {
            const isOpen = open === o.id
            return (
              <div key={o.id} className="rounded-2xl border border-border">
                <button onClick={() => setOpen(isOpen ? null : o.id)} className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 text-left">
                  <div className="min-w-0">
                    <span className="font-display text-base text-plum">{o.order_number}</span>
                    <span className="ml-2 font-body text-xs font-light text-muted-foreground">{new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    <span className="ml-2 font-body text-xs font-light text-muted-foreground">· {o.address?.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-body text-sm font-medium text-plum">{formatINR(Number(o.total))}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-border px-4 py-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="font-body text-xs font-medium uppercase tracking-wide text-muted-foreground">Items</p>
                        <ul className="mt-2 space-y-1 font-body text-sm text-plum/80">
                          {o.order_items?.map((it) => (
                            <li key={it.id}>{it.qty} × {it.product_name} <span className="text-muted-foreground">({it.size}{it.pages ? `, ${it.pages}p` : ''})</span></li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-body text-xs font-medium uppercase tracking-wide text-muted-foreground">Deliver to</p>
                        <p className="mt-2 break-anywhere font-body text-sm font-light text-plum/80">
                          {o.address?.name}<br />
                          {o.address?.address}, {o.address?.city}, {o.address?.state} — {o.address?.pincode}<br />
                          {o.address?.mobile} · {o.address?.email}
                        </p>
                        <p className="mt-2 font-body text-xs font-light text-muted-foreground">
                          Payment: {o.payment_method ?? '—'}{o.coupon ? ` · Coupon ${o.coupon}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                      <span className="font-body text-xs font-medium uppercase tracking-wide text-muted-foreground">Set status:</span>
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatus(o.id, s)}
                          className={cn('rounded-full px-3 py-1 font-body text-xs font-medium capitalize transition', o.status === s ? 'bg-royal text-white' : 'border border-border text-plum/70 hover:border-royal')}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
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
