import { useEffect, useState } from 'react'
import { supabase, type CouponRow } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { useSeo } from '@/lib/seo'
import { logAdmin } from '@/lib/adminLog'
import { Plus, Trash } from '@/components/Icons'
import { AdminCard, AdminField, AdminInput, AdminToggle, StatusBadge } from './ui'

export default function AdminCoupons() {
  useSeo('Admin — Coupons', 'Manage SUVADU discount coupons.')
  const { notify } = useToast()
  const [coupons, setCoupons] = useState<CouponRow[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ code: '', discount: '10', expires: '', active: true })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    supabase.from('coupons').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (!active) return
      setCoupons((data as CouponRow[]) ?? [])
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    const code = form.code.trim().toUpperCase()
    const pct = Number(form.discount)
    if (!code) { notify('Enter a coupon code.'); return }
    if (!pct || pct <= 0 || pct > 100) { notify('Discount must be between 1 and 100.'); return }
    setSaving(true)
    const { data, error } = await supabase
      .from('coupons')
      .insert({ code, discount_pct: pct, active: form.active, expires_at: form.expires ? new Date(form.expires).toISOString() : null })
      .select()
      .single()
    setSaving(false)
    if (error) { notify(error.message.includes('duplicate') ? 'That code already exists.' : error.message); return }
    setCoupons((prev) => [data as CouponRow, ...prev])
    logAdmin('coupon.create', code, { discount_pct: pct })
    setForm({ code: '', discount: '10', expires: '', active: true })
    notify(`Coupon ${code} created.`)
  }

  async function toggle(c: CouponRow) {
    const { error } = await supabase.from('coupons').update({ active: !c.active }).eq('code', c.code)
    if (error) { notify(error.message); return }
    setCoupons((prev) => prev.map((x) => (x.code === c.code ? { ...x, active: !x.active } : x)))
  }

  async function remove(code: string) {
    const { error } = await supabase.from('coupons').delete().eq('code', code)
    if (error) { notify(error.message); return }
    setCoupons((prev) => prev.filter((x) => x.code !== code))
    logAdmin('coupon.delete', code)
    notify(`Coupon ${code} deleted.`)
  }

  return (
    <div className="space-y-6">
      <AdminCard title="Create coupon">
        <form onSubmit={create} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminInput label="Code" value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v.toUpperCase() }))} placeholder="SUVADU10" />
          <AdminInput label="Discount %" type="number" value={form.discount} onChange={(v) => setForm((f) => ({ ...f, discount: v }))} />
          <AdminField label="Expires (optional)">
            <input type="date" className="field" value={form.expires} onChange={(e) => setForm((f) => ({ ...f, expires: e.target.value }))} />
          </AdminField>
          <div className="flex items-end gap-4">
            <AdminToggle checked={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} label="Active" />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button type="submit" disabled={saving} className="btn-primary btn-sm"><Plus width={15} /> {saving ? 'Saving…' : 'Add coupon'}</button>
          </div>
        </form>
      </AdminCard>

      <AdminCard title={`Coupons (${coupons.length})`}>
        {loading ? (
          <p className="font-body text-sm font-light text-muted-foreground">Loading…</p>
        ) : coupons.length === 0 ? (
          <p className="font-body text-sm font-light text-muted-foreground">No coupons yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-scroll w-full text-left font-body text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Code</th>
                  <th className="py-2 pr-4 font-medium">Discount</th>
                  <th className="py-2 pr-4 font-medium">Expires</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.code} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-plum">{c.code}</td>
                    <td className="py-2.5 pr-4 text-plum">{c.discount_pct}%</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td className="py-2.5 pr-4"><StatusBadge status={c.active ? 'active' : 'inactive'} /></td>
                    <td className="py-2.5 text-right">
                      <div className="inline-flex items-center gap-3">
                        <button onClick={() => toggle(c)} className="font-medium text-royal hover:underline">{c.active ? 'Deactivate' : 'Activate'}</button>
                        <button onClick={() => remove(c.code)} className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-rose-500"><Trash width={13} /> Delete</button>
                      </div>
                    </td>
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
