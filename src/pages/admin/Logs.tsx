import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useSeo } from '@/lib/seo'
import { AdminCard } from './ui'

interface LogRow {
  id: string
  actor: string | null
  action: string
  entity: string | null
  detail: Record<string, unknown> | null
  created_at: string
}

export default function AdminLogs() {
  useSeo('Admin — Activity Log', 'SUVADU admin activity log.')
  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase.from('admin_activity_log').select('*').order('created_at', { ascending: false }).limit(200).then(({ data }) => {
      if (!active) return
      setLogs((data as LogRow[]) ?? [])
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  return (
    <AdminCard title={`Activity Log (${logs.length})`}>
      {loading ? (
        <p className="font-body text-sm font-light text-muted-foreground">Loading…</p>
      ) : logs.length === 0 ? (
        <p className="font-body text-sm font-light text-muted-foreground">No admin activity recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-scroll w-full text-left font-body text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">When</th>
                <th className="py-2 pr-4 font-medium">Action</th>
                <th className="py-2 pr-4 font-medium">Entity</th>
                <th className="py-2 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-border/60 last:border-0 align-top">
                  <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground">{new Date(l.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="py-2.5 pr-4"><span className="rounded-full bg-lilac px-2.5 py-0.5 font-body text-xs font-medium text-royal">{l.action}</span></td>
                  <td className="break-anywhere py-2.5 pr-4 font-mono text-xs text-plum/80">{l.entity ?? '—'}</td>
                  {/* Bounded so one large JSON payload can't stretch the row */}
                  <td className="break-anywhere max-w-[20rem] py-2.5 font-mono text-xs text-muted-foreground">{l.detail ? JSON.stringify(l.detail) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminCard>
  )
}
