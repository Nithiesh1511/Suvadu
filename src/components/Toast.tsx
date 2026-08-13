import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Check } from './Icons'

interface ToastMsg { id: number; text: string }
interface ToastApi { notify: (text: string) => void }

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const idRef = useRef(0)

  const notify = useCallback((text: string) => {
    const id = ++idRef.current
    setToasts((t) => [...t, { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      {/* Anchored to both edges on phones so a long message wraps inside the
          viewport instead of growing off-screen to the left. Raised clear of the
          floating WhatsApp button, which owns the bottom-right corner. */}
      <div className="pointer-events-none fixed inset-x-4 bottom-24 z-[100] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-6 sm:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex w-full items-center gap-3 rounded-2xl bg-plum px-4 py-3 text-sm text-white shadow-lift animate-fade-up sm:w-auto sm:max-w-sm sm:rounded-full sm:px-5"
          >
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-royal-400/40">
              <Check width={14} height={14} />
            </span>
            <span className="min-w-0 break-anywhere">{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
