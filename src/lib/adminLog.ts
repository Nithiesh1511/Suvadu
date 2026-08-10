import { supabase } from '@/lib/supabase'

// ── Admin activity log (Dev Brief §10.5) ─────────────────────────────────────
// Best-effort insert into admin_activity_log for admin mutations. RLS restricts
// inserts to admins; failures are swallowed so logging never blocks an action.
export async function logAdmin(action: string, entity?: string | null, detail?: Record<string, unknown>): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser()
    await supabase.from('admin_activity_log').insert({
      actor: data.user?.id ?? null,
      action,
      entity: entity ?? null,
      detail: detail ?? null,
    })
  } catch {
    /* logging is best-effort */
  }
}
