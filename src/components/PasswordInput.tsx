import { useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from '@/components/Icons'
import { cn } from '@/lib/utils'

// ── Password input with a reveal toggle ─────────────────────────────────────
// Same `.field` look as every other input, plus an eye button that flips the
// type between password and text. Typing on a phone keyboard is error-prone, so
// letting people check what they typed cuts failed sign-ins.

export default function PasswordInput({ value, onChange, required, autoComplete, className, ...rest }: {
  value: string
  onChange: (v: string) => void
  required?: boolean
  /** Without this a password manager can neither fill nor offer to save. */
  autoComplete?: string
  className?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'className'>) {
  const [visible, setVisible] = useState(false)
  const action = visible ? 'Hide password' : 'Show password'

  return (
    <div className={cn('relative', className)}>
      <input
        {...rest}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        className="field pr-12"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={action}
        aria-pressed={visible}
        title={action}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-muted-foreground transition hover:text-royal focus-visible:text-royal"
      >
        {visible ? <EyeOff width={18} height={18} /> : <Eye width={18} height={18} />}
      </button>
    </div>
  )
}
