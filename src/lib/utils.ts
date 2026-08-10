/** Conditional className composer (clsx-lite — no external dep). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

/** Format a number as Indian Rupee currency, e.g. 1299 -> "₹1,299". */
export function formatINR(value: number): string {
  return '₹' + value.toLocaleString('en-IN')
}

/** Basic email shape check (client-side UX guard, not full RFC validation). */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

/** Indian mobile: 10 digits starting 6–9 (ignores spaces / +91 the caller strips). */
export function isMobile(value: string): boolean {
  return /^[6-9]\d{9}$/.test(value.replace(/\D/g, ''))
}

/** Convert a name to a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
