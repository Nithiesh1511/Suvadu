import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, type OrderRow } from '@/lib/supabase'
import { useCatalog } from '@/context/CatalogContext'
import { useSeo } from '@/lib/seo'
import { formatINR } from '@/lib/utils'
import { AdminCard, StatusBadge } from './ui'

export default function Dashboard() {
  useSeo('Admin — Dashboard', 'SUVADU admin dashboard.')
  const { products } = useCatalog()
  const [stats, setStats] = useState({ orders: 0, newContacts: 0, pendingReviews: 0 })
  const [recent, setRecent] = useState<OrderRow[]>([])

  useEffect(() => {
    let active = true
    Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('contact_requests').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5),
    ]).then(([o, c, r, recentOrders]) => {
      if (!active) return
      setStats({ orders: o.count ?? 0, newContacts: c.count ?? 0, pendingReviews: r.count ?? 0 })
      setRecent((recentOrders.data as OrderRow[]) ?? [])
    })
    return () => { active = false }
  }, [])

  const cards = [
    { label: 'Products', value: products.length, to: '/admin/products' },
    { label: 'Orders', value: stats.orders, to: '/admin/orders' },
    { label: 'New contact requests', value: stats.newContacts, to: '/admin/contact-requests' },
    { label: 'Pending reviews', value: stats.pendingReviews, to: '/admin/reviews' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="rounded-2xl border border-border bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
            <p className="font-body text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.label}</p>
            <p className="mt-2 font-display text-3xl text-plum">{c.value}</p>
          </Link>
        ))}
      </div>

      <AdminCard title="Recent orders" action={<Link to="/admin/orders" className="font-body text-sm font-medium text-royal hover:underline">View all</Link>}>
        {recent.length === 0 ? (
          <p className="font-body text-sm font-light text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-scroll w-full text-left font-body text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Order</th>
                  <th className="py-2 pr-4 font-medium">Total</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Placed</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-plum">{o.order_number}</td>
                    <td className="py-2.5 pr-4 text-plum">{formatINR(Number(o.total))}</td>
                    <td className="py-2.5 pr-4"><StatusBadge status={o.status} /></td>
                    <td className="py-2.5 text-muted-foreground">{new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  )
}
