// ── Server-authoritative pricing ─────────────────────────────────────────────
// The order row's subtotal / discount / total are written by the browser, so
// they are a claim, not a fact. Before Razorpay is asked to charge anything,
// recompute what the order SHOULD cost from the line items, the live `products`
// prices and the validated coupon — and refuse to charge if the two disagree.
//
// The arithmetic here mirrors `src/context/StoreContext.tsx` (subtotal /
// discount / total) and `priceForPages` in `src/data/products.ts` exactly,
// including the rounding, so a legitimate order always agrees to the rupee.
// If you change the pricing rules on the client, change them here too.

/** Mirrors PAGE_PRICE_FACTOR in src/data/products.ts. */
export const PAGE_PRICE_FACTOR: Record<number, number> = {
  80: 0.85,
  120: 0.92,
  160: 1,
  200: 1.12,
}

/** Mirrors DEFAULT_PAGES in src/data/products.ts. */
export const DEFAULT_PAGES = 160

/** Accessories are not rows in `products` — mirrors BOOKMARKS / BOOKMARK_PRICE
 *  in src/data/products.ts. Keyed by the same ids the client sends. */
export const ACCESSORY_PRICES: Record<string, number> = {
  BM1: 99,
  BM2: 99,
  BM3: 99,
  BM4: 99,
}

export interface OrderItemRow {
  product_id: string
  size: string | null
  qty: number
  pages: number | null
}

export interface ProductPriceRow {
  id: string
  price_a5: number | string | null
  price_a4: number | string | null
  price_custom: number | string | null
}

export interface PricedOrder {
  subtotal: number
  discount: number
  total: number
}

type Priced = { ok: true; value: PricedOrder } | { ok: false; error: string }

function toNumber(v: number | string | null): number | null {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Mirrors priceForPages() in src/data/products.ts. */
function priceForPages(basePrice: number, pages: number): number {
  return Math.round(basePrice * (PAGE_PRICE_FACTOR[pages] ?? 1))
}

function basePriceFor(row: ProductPriceRow, size: string): number | null {
  switch (size) {
    case 'A5': return toNumber(row.price_a5)
    case 'A4': return toNumber(row.price_a4)
    case 'Custom': return toNumber(row.price_custom)
    default: return null
  }
}

/**
 * Recompute an order's true cost.
 *
 * @param items    the order's line items
 * @param products the live `products` rows for every non-accessory line
 * @param rate     the validated coupon rate as a fraction of the subtotal
 *                 (0 when there is no coupon, or it is expired / unknown)
 */
export function priceOrder(
  items: OrderItemRow[],
  products: ProductPriceRow[],
  rate: number,
): Priced {
  if (items.length === 0) return { ok: false, error: 'This order has no items.' }

  const byId = new Map(products.map((p) => [p.id, p]))
  let subtotal = 0

  for (const item of items) {
    const qty = Number(item.qty)
    if (!Number.isInteger(qty) || qty < 1) {
      return { ok: false, error: 'This order has an invalid quantity.' }
    }

    const size = item.size ?? 'A5'
    const accessory = ACCESSORY_PRICES[item.product_id]
    let base: number | null

    if (accessory != null) {
      // Accessories are one price, no size and no page count.
      base = accessory
    } else {
      const row = byId.get(item.product_id)
      if (!row) {
        return { ok: false, error: 'An item in this order is no longer available.' }
      }
      base = basePriceFor(row, size)
    }

    if (base == null) {
      return { ok: false, error: `“${size}” is not a size we can price for one of these items.` }
    }

    const pages = accessory != null ? DEFAULT_PAGES : (item.pages ?? DEFAULT_PAGES)
    subtotal += priceForPages(base, pages) * qty
  }

  // Clamped exactly as the cart clamps it, so a bad coupon rate can never
  // produce a negative total on either side of the comparison.
  const safeRate = Math.min(1, Math.max(0, rate))
  const discount = Math.min(subtotal, Math.round(subtotal * safeRate))

  return { ok: true, value: { subtotal, discount, total: Math.max(0, subtotal - discount) } }
}

/** The coupon's rate, or 0 if it is missing, inactive or expired. */
export function couponRate(
  row: { discount_pct: number | string; expires_at: string | null; active?: boolean | null } | null,
  now: number,
): number {
  if (!row) return 0
  if (row.active === false) return 0
  if (row.expires_at && new Date(row.expires_at).getTime() < now) return 0
  const pct = Number(row.discount_pct)
  if (!Number.isFinite(pct)) return 0
  return Math.min(1, Math.max(0, pct / 100))
}
