import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/Toast'
import PageHeader from '@/components/PageHeader'
import { authRedirectError } from '@/lib/supabase'
import { User, Check } from '@/components/Icons'
import { cn } from '@/lib/utils'

const MIN_LENGTH = 6

// ── Set a new password ──────────────────────────────────────────────────────
// Landing page for the Supabase recovery email (resetPasswordForEmail sends the
// user here). Clicking that link hands the client a short-lived session, so by
// the time auth bootstrap finishes a session either exists — the link was good —
// or it doesn't, and the link was expired/already used.
export default function ResetPassword() {
  const { session, loading, updatePassword } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password.length < MIN_LENGTH) { setError(`Password must be at least ${MIN_LENGTH} characters.`); return }
    if (form.password !== form.confirm) { setError('Passwords don’t match.'); return }
    setBusy(true)
    const res = await updatePassword(form.password)
    setBusy(false)
    if (!res.ok) { setError(res.message); return }
    setForm({ password: '', confirm: '' })
    setDone(true)
    notify(res.message)
  }

  return (
    <div>
      <PageHeader title="Reset Password" crumbs={[{ label: 'Account', to: '/account' }, { label: 'Reset Password' }]} />
      <section className="container-suvadu py-16">
        <div className="card-surface mx-auto max-w-md p-7">
          {loading ? (
            <Shell icon={<User width={26} />} heading="Checking your link" blurb="One moment while we verify your reset link…" />
          ) : done ? (
            <Shell icon={<Check width={26} />} heading="Password updated" blurb="You’re signed in with your new password.">
              <button onClick={() => navigate('/account')} className="btn-primary btn-lg mt-6 w-full">Go to My Account</button>
            </Shell>
          ) : !session ? (
            <Shell
              icon={<User width={26} />}
              heading="This link isn’t valid"
              blurb={authRedirectError ?? 'Password-reset links expire after a short while and can only be used once. Request a fresh one and try again.'}
            >
              <Link to="/account" className="btn-primary btn-lg mt-6 w-full">Request a new link</Link>
            </Shell>
          ) : (
            <Shell icon={<User width={26} />} heading="Choose a new password" blurb={`Pick something at least ${MIN_LENGTH} characters long.`}>
              <form onSubmit={submit} className="mt-6 space-y-4">
                <Input
                  label="New Password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(v) => setForm((f) => ({ ...f, password: v }))}
                  required
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={(v) => setForm((f) => ({ ...f, confirm: v }))}
                  required
                />
                {error && <p className="font-body text-sm font-medium text-rose-500">{error}</p>}
                <button type="submit" disabled={busy} className="btn-primary btn-lg w-full">
                  {busy ? 'Please wait…' : 'Update Password'}
                </button>
              </form>
              <p className="mt-5 text-center font-body text-sm font-light text-muted-foreground">
                <Link to="/account" className="font-medium text-royal hover:underline">← Back to sign in</Link>
              </p>
            </Shell>
          )}
        </div>
      </section>
    </div>
  )
}

/* ---------- Small UI helpers ---------- */
function Shell({ icon, heading, blurb, children }: {
  icon: React.ReactNode; heading: string; blurb: string; children?: React.ReactNode
}) {
  return (
    <>
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-lilac text-royal">{icon}</span>
      <h2 className="mt-5 text-center font-display text-2xl text-plum">{heading}</h2>
      <p className="mt-1 text-center font-body text-sm font-light text-muted-foreground">{blurb}</p>
      {children}
    </>
  )
}

function Input({ label, value, onChange, type = 'text', required, autoComplete, className }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; required?: boolean; autoComplete?: string; className?: string
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block font-body text-xs font-medium uppercase tracking-wide text-plum">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} autoComplete={autoComplete} className="field" />
    </label>
  )
}
