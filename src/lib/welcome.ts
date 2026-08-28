import { supabase } from '@/lib/supabase'

// ── The newsletter's welcome offer ───────────────────────────────────────────
// The home page trades a discount for an email address. There is no transactional
// email in this app, so the only way to keep that promise is to hand the code
// over on the spot — and the only honest way to make the promise at all is to
// check first that the coupon really is live.

export const WELCOME_COUPON = 'SUVADU10'

export interface WelcomeOffer {
  code: string
  /** Whole percent off, e.g. 10. */
  pct: number
}

export interface CouponRow {
  code: string
  discount_pct: number | string
  expires_at: string | null
  active?: boolean | null
}

/** A coupon row as an offer, or null if it can't actually be honoured —
 *  missing, deactivated, expired, or a nonsense percentage. */
export function toOffer(row: CouponRow | null, now: number = Date.now()): WelcomeOffer | null {
  if (!row) return null
  if (row.active === false) return null
  if (row.expires_at && new Date(row.expires_at).getTime() < now) return null

  const pct = Math.round(Number(row.discount_pct))
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return null

  return { code: row.code, pct }
}

/** The welcome coupon, or null if it is missing, deactivated or expired —
 *  in which case the page must not advertise a discount. */
export async function fetchWelcomeOffer(): Promise<WelcomeOffer | null> {
  const { data, error } = await supabase
    .from('coupons')
    .select('code, discount_pct, expires_at, active')
    .eq('code', WELCOME_COUPON)
    .maybeSingle()

  if (error) return null
  return toOffer((data as CouponRow) ?? null)
}
