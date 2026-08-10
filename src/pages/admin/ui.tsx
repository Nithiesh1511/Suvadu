import { cn } from '@/lib/utils'

// Small shared building blocks for the admin modules.

export function AdminCard({ title, action, children, className }: {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6', className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-display text-xl text-plum">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

export function AdminField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block font-body text-xs font-medium uppercase tracking-wide text-plum">{label}</span>
      {children}
    </label>
  )
}

export function AdminInput({ label, value, onChange, type = 'text', placeholder, className, required }: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  className?: string
  required?: boolean
}) {
  return (
    <AdminField label={label} className={className}>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className="field" />
    </AdminField>
  )
}

export function AdminToggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="inline-flex items-center gap-2.5">
      <span className={cn('grid h-5 w-9 items-center rounded-full px-0.5 transition', checked ? 'bg-royal' : 'bg-border')}>
        <span className={cn('h-4 w-4 rounded-full bg-white transition-transform', checked && 'translate-x-4')} />
      </span>
      <span className="font-body text-sm text-plum">{label}</span>
    </button>
  )
}

const STATUS_TONES: Record<string, string> = {
  // orders
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-amber-100 text-amber-700',
  shipped: 'bg-sky-100 text-sky-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-600',
  // reviews / contact
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-600',
  new: 'bg-royal/10 text-royal',
  resolved: 'bg-emerald-100 text-emerald-700',
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-neutral-200 text-neutral-600',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-block rounded-full px-2.5 py-0.5 font-body text-xs font-medium capitalize', STATUS_TONES[status] ?? 'bg-lilac text-royal')}>
      {status}
    </span>
  )
}
