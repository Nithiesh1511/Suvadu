// ============================================================
// SUVADU NOTEBOOKS — Catalogue data
// Mirrors the Dev Brief: collections, sizes, pricing & colours.
// In production this is served by the Shopify admin / backend.
// ============================================================

export type SizeKey = 'A5' | 'A4' | 'Custom'
export type ProductType = 'basic' | 'customized' | 'set'
export type Pattern = 'plain' | 'lines' | 'dots' | 'floral' | 'wave' | 'mono' | 'stars' | 'kids'

export interface ColourOption {
  name: string
  hex: string
}

export interface Collection {
  slug: string
  displayName: string
  internalName: string
  description: string
  count: number
  accent: string
  pattern: Pattern
}

export interface SpecialCollection {
  slug: string
  displayName: string
  details: string
  type: string
}

export interface Product {
  id: string
  slug: string
  name: string
  type: ProductType
  collectionSlug: string
  collectionName: string
  prices: { A5: number; A4: number | null; Custom: number | null }
  customPriceOnRequest?: boolean
  description: string
  specs: string[]
  colour: ColourOption
  pattern: Pattern
  image?: string // admin-uploaded cover image (data URL); falls back to generated cover
  rating: number
  reviews: number
  bestseller?: boolean
  isNew?: boolean
  stock?: number | null // null/undefined = not tracked; 0 = out of stock
}

// ---- Section 5: Colour Options — Minimal Aesthetic Collection ----
export const COLOURS: ColourOption[] = [
  { name: 'Ivory White', hex: '#FFFFF0' },
  { name: 'Beige', hex: '#F5F0E8' },
  { name: 'Sand', hex: '#C2B280' },
  { name: 'Sage Green', hex: '#B2AC88' },
  { name: 'Lavender', hex: '#E6E6FA' },
  { name: 'Blush Pink', hex: '#FF8DA1' },
  { name: 'Charcoal Black', hex: '#36454F' },
  { name: 'Muted Terracotta', hex: '#C98B72' },
  { name: 'Warm Cream', hex: '#FFFDD0' },
  { name: 'Powder Blue', hex: '#B0D4E8' },
]

// ---- Section 6.1: Main Collections ----
export const COLLECTIONS: Collection[] = [
  {
    slug: 'calm-collection',
    displayName: 'Calm Collection',
    internalName: 'Minimal Aesthetic',
    description: 'Quiet, considered covers in soft neutrals — made for clear thinking.',
    count: 5,
    accent: '#E6E6FA',
    pattern: 'plain',
  },
  {
    slug: 'inspire-ink',
    displayName: 'Inspire Ink',
    internalName: 'Motivational',
    description: 'Words that move you, printed on covers that keep you going.',
    count: 4,
    accent: '#F3E8FF',
    pattern: 'mono',
  },
  {
    slug: 'nature-notes',
    displayName: 'Nature Notes',
    internalName: 'Nature & Floral',
    description: 'Botanicals and blooms for the journal lover who grows ideas.',
    count: 5,
    accent: '#B2AC88',
    pattern: 'floral',
  },
  {
    slug: 'rhythm-series',
    displayName: 'Rhythm Series',
    internalName: 'Pattern Collection',
    description: 'Geometric repetition with a beat — pattern lovers, this is yours.',
    count: 5,
    accent: '#C98B72',
    pattern: 'wave',
  },
  {
    slug: 'midnight-collection',
    displayName: 'Midnight Collection',
    internalName: 'Black Series',
    description: 'Deep, dramatic and matte. The notebook that means business.',
    count: 3,
    accent: '#36454F',
    pattern: 'dots',
  },
  {
    slug: 'her-journal',
    displayName: 'Her Journal',
    internalName: "Women's Collection",
    description: 'Elegant covers designed to be written in and treasured.',
    count: 5,
    accent: '#FF8DA1',
    pattern: 'floral',
  },
  {
    slug: 'tiny-tales',
    displayName: 'Tiny Tales',
    internalName: 'Kids Collection',
    description: 'Playful, durable notebooks for the youngest storytellers.',
    count: 4,
    accent: '#B0D4E8',
    pattern: 'kids',
  },
]

// ---- Section 6.2: Special Collections ----
export const SPECIAL_COLLECTIONS: SpecialCollection[] = [
  {
    slug: 'match-and-write',
    displayName: 'Match & Write',
    details: '5 matching sets — two notebooks, gift-ready packaging.',
    type: 'Matching Sets',
  },
  {
    slug: 'made-for-you',
    displayName: 'Made For You',
    details: 'Your name, beautifully set on a premium cover.',
    type: 'Personalized — Name',
  },
  {
    slug: 'create-and-carry',
    displayName: 'Create & Carry',
    details: 'Full custom cover — your text, font and colour.',
    type: 'Personalized — Custom',
  },
]

// ---- Section 4.2: Pricing per product type ----
const PRICING: Record<ProductType, Product['prices']> = {
  basic: { A5: 299, A4: 399, Custom: null }, // Custom "Available" — price on request
  customized: { A5: 399, A4: 499, Custom: null },
  set: { A5: 599, A4: 799, Custom: null },
}

const ADJECTIVES = ['Serene', 'Quiet', 'Bold', 'Soft', 'Lumen', 'Aura', 'Verse', 'Solace', 'Muse', 'Echo']

function buildProducts(): Product[] {
  const list: Product[] = []
  let n = 0

  COLLECTIONS.forEach((col) => {
    for (let i = 0; i < col.count; i++) {
      n++
      const colour = COLOURS[(n + i) % COLOURS.length]
      const name = `${ADJECTIVES[i % ADJECTIVES.length]} ${col.displayName.split(' ')[0]} Notebook`
      const slug = `${col.slug}-${i + 1}`
      const bestseller = i === 0 && ['calm-collection', 'nature-notes', 'midnight-collection', 'her-journal'].includes(col.slug)
      list.push({
        id: `P${String(n).padStart(3, '0')}`,
        slug,
        name,
        type: 'basic',
        collectionSlug: col.slug,
        collectionName: col.displayName,
        prices: PRICING.basic,
        description: `A ${col.internalName.toLowerCase()} notebook from the ${col.displayName}. ${col.description} Premium 100 GSM paper, lay-flat binding and a cover finished to last.`,
        specs: ['100 GSM premium paper', '160 pages', 'Lay-flat thread binding', 'Soft-touch matte cover', 'Rounded corners'],
        colour,
        pattern: col.pattern,
        rating: 4.6 + ((n % 4) * 0.1),
        reviews: 18 + ((n * 7) % 120),
        bestseller,
        isNew: i === col.count - 1 && ['calm-collection', 'rhythm-series'].includes(col.slug),
      })
    }
  })

  return list
}

export const PRODUCTS: Product[] = buildProducts()

// A featured "Customized Notebook" used on the personalization special collections
export const CUSTOMIZED_PRODUCT: Product = {
  id: 'P-CUSTOM',
  slug: 'customized-notebook',
  name: 'Customized Notebook',
  type: 'customized',
  collectionSlug: 'made-for-you',
  collectionName: 'Made For You',
  prices: PRICING.customized,
  customPriceOnRequest: true,
  description:
    'Make it unmistakably yours. Add your name or a short line of text, pick a font and a cover colour, and we’ll craft a one-of-one notebook. Personalised cover: name, text, font and colour.',
  specs: ['100 GSM premium paper', '160 pages', 'Personalised foil-style cover', 'Choice of font & colour', 'Gift-ready'],
  colour: { name: 'Lavender', hex: '#E6E6FA' },
  pattern: 'plain',
  rating: 4.9,
  reviews: 212,
  bestseller: true,
}

export const MATCHING_SET_PRODUCT: Product = {
  id: 'P-SET',
  slug: 'matching-set',
  name: 'Matching Set (x2)',
  type: 'set',
  collectionSlug: 'match-and-write',
  collectionName: 'Match & Write',
  prices: PRICING.set,
  description:
    'Two beautifully matched notebooks in gift-ready packaging. Perfect to keep one and gift one — or to separate work and wandering thoughts.',
  specs: ['Two matching notebooks', '100 GSM premium paper', 'Gift-ready box', '160 pages each', 'Coordinated cover art'],
  colour: { name: 'Blush Pink', hex: '#FF8DA1' },
  pattern: 'wave',
  rating: 4.8,
  reviews: 96,
}

export const ALL_PRODUCTS: Product[] = [...PRODUCTS, CUSTOMIZED_PRODUCT, MATCHING_SET_PRODUCT]

export function getProductBySlug(slug: string): Product | undefined {
  return ALL_PRODUCTS.find((p) => p.slug === slug)
}

export function getProductsByCollection(slug: string): Product[] {
  return PRODUCTS.filter((p) => p.collectionSlug === slug)
}

export function getBestSellers(): Product[] {
  return ALL_PRODUCTS.filter((p) => p.bestseller).slice(0, 4)
}

export const FONT_OPTIONS = ['DM Serif Display', 'DM Sans', 'Classic Script', 'Modern Mono', 'Elegant Italic']

// ---- Page-count options (number of inner pages) ----
export const PAGE_OPTIONS = [120, 160] as const
export const DEFAULT_PAGES = 160

// Listed prices are for the 160-page notebook. Fewer/more pages scale the price
// so the page selector actually changes what you pay.
export const PAGE_PRICE_FACTOR: Record<number, number> = {
  80: 0.85,
  120: 0.92,
  160: 1,
  200: 1.12,
}

/** Unit price for a given base (per-size) price and page count, rounded to ₹. */
export function priceForPages(basePrice: number, pages: number): number {
  return Math.round(basePrice * (PAGE_PRICE_FACTOR[pages] ?? 1))
}

export const SIZE_INFO: Record<SizeKey, { dims: string; note: string }> = {
  A5: { dims: '148 × 210 mm', note: 'Standard size — all products' },
  A4: { dims: '210 × 297 mm', note: 'Available on request' },
  Custom: { dims: 'You decide', note: 'Customized Notebook only — price on request' },
}

// ---- Section 8: Accessories — Bookmarks (4 designs, price TBD) ----
export interface Bookmark {
  id: string
  name: string
  colour: ColourOption
  pattern: Pattern
}
export const BOOKMARKS: Bookmark[] = [
  { id: 'BM1', name: 'Bookmark — Design 1', colour: { name: 'Lavender', hex: '#E6E6FA' }, pattern: 'plain' },
  { id: 'BM2', name: 'Bookmark — Design 2', colour: { name: 'Sage Green', hex: '#B2AC88' }, pattern: 'floral' },
  { id: 'BM3', name: 'Bookmark — Design 3', colour: { name: 'Muted Terracotta', hex: '#C98B72' }, pattern: 'wave' },
  { id: 'BM4', name: 'Bookmark — Design 4', colour: { name: 'Charcoal Black', hex: '#36454F' }, pattern: 'mono' },
]

// ---- Home: Customer Reviews ----
export interface Review {
  name: string
  rating: number
  text: string
  location: string
}
export const REVIEWS: Review[] = [
  { name: 'Ananya R.', rating: 5, location: 'Bengaluru', text: 'The paper quality is unreal — no bleed-through with my fountain pen. The lilac cover is even prettier in person.' },
  { name: 'Karthik M.', rating: 5, location: 'Chennai', text: 'Ordered a personalised set for my partner. The name foil looked premium and packaging was gift-ready. Will reorder.' },
  { name: 'Sneha P.', rating: 4, location: 'Pune', text: 'Beautiful minimal design. Lay-flat binding makes journaling a joy. Shipping was quick across India.' },
  { name: 'Devika S.', rating: 5, location: 'Kochi', text: 'Suvadu nails the aesthetic. The Calm Collection sits perfectly on my desk and writing in it feels special.' },
]

// ---- FAQ: Section 7.5 — 5 categories ----
export interface FaqItem {
  q: string
  a: string
}
export const FAQ: Record<string, FaqItem[]> = {
  Shipping: [
    { q: 'Where do you ship?', a: 'We ship pan-India via Shiprocket. Most metros receive orders in 2–4 business days; other locations in 4–7 days.' },
    { q: 'How much does shipping cost?', a: 'Shipping is free across India — the price you see is the price you pay, with no separate delivery charge at checkout.' },
    { q: 'Can I track my order?', a: 'Yes. Once shipped you’ll receive a tracking link by SMS and email, and you can track it under My Account → Order History.' },
  ],
  Customization: [
    { q: 'What can I personalise?', a: 'On Customized Notebooks you can add a name or short text, choose a font, and pick a cover colour. Live preview updates as you edit.' },
    { q: 'Is there a price difference for custom sizes?', a: 'Custom sizes on the Customized Notebook are priced on request. A5 and A4 prices are shown on the product page.' },
    { q: 'Can I see a proof before printing?', a: 'For complex custom designs (Create & Carry) we share a digital proof for approval before production.' },
  ],
  Returns: [
    { q: 'What is your return window?', a: 'Non-personalised products can be returned within 7 days of delivery if unused and in original packaging. See our Return & Refund Policy.' },
    { q: 'Are personalised notebooks returnable?', a: 'Personalised items are made-to-order and can’t be returned unless they arrive damaged or defective.' },
    { q: 'How are refunds processed?', a: 'Approved refunds are credited to your original payment method within 5–7 business days.' },
  ],
  Payments: [
    { q: 'Which payment methods do you accept?', a: 'We accept UPI, Debit Card, Credit Card and Net Banking via Razorpay — a PCI-compliant, secure gateway.' },
    { q: 'Is my payment secure?', a: 'Yes. Payments are processed over HTTPS through Razorpay. We never store your full card details.' },
    { q: 'Do you accept Cash on Delivery?', a: 'Currently we accept prepaid orders only to keep prices and quality consistent.' },
  ],
  Orders: [
    { q: 'Can I modify or cancel my order?', a: 'You can cancel before dispatch from My Account → Order History. Personalised orders can’t be modified once production starts.' },
    { q: 'Do I need an account to order?', a: 'You can browse and add to cart freely. An account is required to save a wishlist, customizations and view order history.' },
    { q: 'I have a coupon — where do I apply it?', a: 'Enter your coupon in the Cart page’s “Apply Coupon” field. Valid codes apply the discount to your total instantly.' },
  ],
}

// Demo coupons (validated client-side here; admin-managed in production)
export const COUPONS: Record<string, number> = {
  SUVADU10: 0.1,
  MARK15: 0.15,
  WELCOME: 0.2,
}
