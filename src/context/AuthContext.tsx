import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, type ProfileRow } from '@/lib/supabase'

// ── Auth + profile ──────────────────────────────────────────────────────────
// Real authentication backed by Supabase Auth (email + password), replacing the
// old client-side gates. The profile row (with the is_admin flag) is fetched
// alongside the session and drives both customer identity and admin access.

interface SignResult {
  ok: boolean
  message: string
  /** true when sign-up succeeded but the account still needs email confirmation. */
  needsConfirmation?: boolean
}

interface AuthState {
  session: Session | null
  profile: ProfileRow | null
  isAdmin: boolean
  loading: boolean
  signUp: (input: { name: string; email: string; password: string; mobile?: string }) => Promise<SignResult>
  signIn: (email: string, password: string) => Promise<SignResult>
  signOut: () => Promise<void>
  updateProfile: (fields: Partial<Pick<ProfileRow, 'name' | 'mobile'>>) => Promise<SignResult>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile((data as ProfileRow) ?? null)
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      loadProfile(data.session?.user.id).finally(() => active && setLoading(false))
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      loadProfile(newSession?.user.id)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signUp = useCallback<AuthState['signUp']>(async ({ name, email, password, mobile }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, mobile: mobile ?? '' } },
    })
    if (error) return { ok: false, message: error.message }
    // With "Confirm email" enabled, no session is returned until the link is clicked.
    if (!data.session) {
      return { ok: true, needsConfirmation: true, message: 'Check your email to confirm your account, then sign in.' }
    }
    return { ok: true, message: 'Account created — welcome to Suvadu!' }
  }, [])

  const signIn = useCallback<AuthState['signIn']>(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { ok: false, message: error.message }
    return { ok: true, message: 'Welcome back!' }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  const updateProfile = useCallback<AuthState['updateProfile']>(
    async (fields) => {
      if (!session?.user.id) return { ok: false, message: 'Not signed in.' }
      const { data, error } = await supabase
        .from('profiles')
        .update(fields)
        .eq('id', session.user.id)
        .select('*')
        .single()
      if (error) return { ok: false, message: error.message }
      setProfile(data as ProfileRow)
      return { ok: true, message: 'Profile updated' }
    },
    [session],
  )

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      isAdmin: Boolean(profile?.is_admin),
      loading,
      signUp,
      signIn,
      signOut,
      updateProfile,
    }),
    [session, profile, loading, signUp, signIn, signOut, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
