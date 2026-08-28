// ── Product ratings, from real reviews ───────────────────────────────────────
// A product's star rating is the mean of its APPROVED reviews, not the
// products.rating / products.reviews columns — those still hold the launch
// placeholders (4.9 / 212 reviews), which is why a product page could advertise
// a rating directly above "No reviews yet — be the first to share yours."

/** Approved-review count and mean for one product. */
export interface ReviewStat {
  count: number
  average: number
}

/** Just the columns the aggregate needs. */
export interface ReviewStatRow {
  product_id: string | null
  rating: number | string
}

/**
 * Fold approved review rows into per-product stats.
 *
 * Rows with no product_id are the site-wide testimonials shown on the home page
 * and in the collections rail — they belong to no product and are skipped.
 * Ratings that aren't finite numbers are skipped rather than poisoning a mean
 * with NaN.
 */
export function aggregateReviewStats(rows: readonly ReviewStatRow[]): Map<string, ReviewStat> {
  const totals = new Map<string, { sum: number; count: number }>()

  for (const row of rows) {
    if (!row.product_id) continue
    const rating = Number(row.rating)
    if (!Number.isFinite(rating)) continue
    const t = totals.get(row.product_id) ?? { sum: 0, count: 0 }
    t.sum += rating
    t.count += 1
    totals.set(row.product_id, t)
  }

  return new Map([...totals].map(([id, t]) => [id, { count: t.count, average: t.sum / t.count }]))
}
