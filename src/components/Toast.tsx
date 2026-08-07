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
      <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 rounded-full bg-plum px-5 py-3 text-sm text-white shadow-lift animate-fade-up"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-royal-400/40">
              <Check width={14} height={14} />
            </span>
            {t.text}
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
