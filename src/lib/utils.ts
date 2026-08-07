/** Conditional className composer (clsx-lite — no external dep). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

/** Format a number as Indian Rupee currency, e.g. 1299 -> "₹1,299". */
export function formatINR(value: number): string {
  return '₹' + value.toLocaleString('en-IN')
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
