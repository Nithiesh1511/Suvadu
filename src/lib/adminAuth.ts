import { useCallback, useEffect, useState } from 'react'

// ── Admin portal auth ───────────────────────────────────────────────────────
// Backend-free prototype gate. Credentials come from Vite env vars at build
// time (VITE_ADMIN_USERNAME / VITE_ADMIN_PASSWORD) with dev-friendly defaults.
//
// NOTE: this is a client-side gate only — the credentials are baked into the
// shipped JS bundle, so this keeps casual visitors out, NOT a determined user
// with devtools. Swap for a real backend session before going live.

const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME ?? 'admin'
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? 'suvadu-admin'

const SESSION_KEY = 'suvadu_admin_auth'

export function checkCredentials(username: string, password: string): boolean {
  return username.trim() === ADMIN_USERNAME && password === ADMIN_PASSWORD
}

function readSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

/** Login gate state for the admin portal. Session lasts until the tab closes. */
export function useAdminAuth() {
  const [isAuthed, setIsAuthed] = useState<boolean>(() => readSession())

  // Keep multiple tabs in sync if one logs out.
  useEffect(() => {
    const sync = () => setIsAuthed(readSession())
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const login = useCallback((username: string, password: string): boolean => {
    if (!checkCredentials(username, password)) return false
    try {
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      /* ignore storage failures — still allow this session in memory */
    }
    setIsAuthed(true)
    return true
  }, [])

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
    setIsAuthed(false)
  }, [])

  return { isAuthed, login, logout }
}
