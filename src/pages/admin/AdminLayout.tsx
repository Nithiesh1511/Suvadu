import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import PageHeader from '@/components/PageHeader'
import { useSeo } from '@/lib/seo'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/collections', label: 'Collections' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/coupons', label: 'Coupons' },
  { to: '/admin/colours', label: 'Colours' },
  { to: '/admin/banners', label: 'Banners' },
  { to: '/admin/faqs', label: 'FAQ' },
  { to: '/admin/reviews', label: 'Reviews' },
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/contact-requests', label: 'Contact Requests' },
  { to: '/admin/logs', label: 'Activity Log' },
]

export default function AdminLayout() {
  const { session, isAdmin, loading, signIn, signOut } = useAuth()

  if (loading) return <AdminMessage title="Loading…" body="Checking your session." />
  if (!session) return <AdminLogin onSignIn={signIn} />
  if (!isAdmin) {
    return (
      <AdminMessage
        title="Not authorised"
        body="This account doesn’t have admin access. Ask an existing admin to enable it (set is_admin = true on your profile)."
        onSignOut={signOut}
      />
    )
  }

  return (
    <div>
      <PageHeader eyebrow="Admin Console" title="SUVADU Admin" crumbs={[{ label: 'Admin' }]} />
      <section className="container-suvadu grid gap-6 py-6 sm:gap-8 sm:py-8 lg:grid-cols-[220px_1fr]">
        <aside className="h-fit lg:sticky lg:top-24">
          {/* A horizontal scroller below lg — twelve modules can't stack usefully
              on a phone, and shrink-0 keeps each label from being compressed. */}
          <nav className="no-scrollbar flex gap-2 overflow-x-auto rounded-2xl border border-border bg-white p-2 shadow-card lg:flex-col lg:overflow-visible">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'shrink-0 whitespace-nowrap rounded-xl px-4 py-2.5 text-left font-body text-sm transition',
                    isActive ? 'bg-royal text-white' : 'text-plum/80 hover:bg-lilac',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={() => signOut()}
              className="shrink-0 whitespace-nowrap rounded-xl px-4 py-2.5 text-left font-body text-sm text-rose-500 transition hover:bg-rose-50"
            >
              Sign out
            </button>
          </nav>
        </aside>

        <div className="min-w-0">
          <Outlet />
        </div>
      </section>
    </div>
  )
}

/* ---------- Gate screens ---------- */
function AdminLogin({ onSignIn }: { onSignIn: (email: string, password: string) => Promise<{ ok: boolean; message: string }> }) {
  useSeo('Admin — Sign in', 'Sign in to the SUVADU admin console.')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const res = await onSignIn(email.trim(), password)
    setBusy(false)
    if (!res.ok) { setError(res.message || 'Incorrect email or password.'); setPassword('') }
  }

  return (
    <div>
      <PageHeader eyebrow="Admin Console" title="Sign in" subtitle="Sign in with your admin account to manage the SUVADU catalogue." crumbs={[{ label: 'Admin' }]} />
      <section className="container-suvadu py-12">
        <form onSubmit={submit} className="card-surface mx-auto max-w-md p-6 sm:p-7">
          <h2 className="font-display text-2xl text-plum">Admin sign in</h2>
          <div className="mt-5 grid gap-5">
            <label className="block">
              <span className="mb-1.5 block font-body text-xs font-medium uppercase tracking-wide text-plum">Email</span>
              <input className="field" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} autoComplete="username" autoFocus required />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-body text-xs font-medium uppercase tracking-wide text-plum">Password</span>
              <input className="field" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} autoComplete="current-password" required />
            </label>
            {error && <p className="font-body text-sm font-medium text-rose-500">{error}</p>}
          </div>
          <button type="submit" disabled={busy} className="btn-primary btn-lg mt-7 w-full">{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
    </div>
  )
}

function AdminMessage({ title, body, onSignOut }: { title: string; body: string; onSignOut?: () => void }) {
  return (
    <div>
      <PageHeader eyebrow="Admin Console" title={title} crumbs={[{ label: 'Admin' }]} />
      <section className="container-suvadu py-16">
        <div className="card-surface mx-auto max-w-md p-7 text-center">
          <p className="font-body text-sm font-light text-muted-foreground">{body}</p>
          {onSignOut && <button onClick={onSignOut} className="btn-secondary mt-6">Sign out</button>}
        </div>
      </section>
    </div>
  )
}
