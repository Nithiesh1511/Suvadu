import { useEffect } from 'react'

// ── SEO meta helper (brief §11) ───────────────────────────────────────────
// Unique <title> (≤60 chars) and meta description (≤160 chars) per page, plus a
// canonical URL and Open Graph / Twitter Card tags so shared links unfurl with a
// title, description and image.
const SITE = 'SUVADU Notebooks'

// Absolute site origin for canonical/OG URLs. Set VITE_SITE_URL to your real
// production domain (e.g. https://suvadunotebooks.com); falls back to the current
// origin at runtime so previews still work.
export const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') || ''

function siteOrigin(): string {
  if (SITE_URL) return SITE_URL
  return typeof window !== 'undefined' ? window.location.origin : ''
}

function upsertMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector(selector) as HTMLMetaElement | null
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, key)
    document.head.appendChild(tag)
  }
  tag.content = content
}

function upsertCanonical(href: string) {
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  link.href = href
}

export function applyMeta(title: string, description?: string, image?: string) {
  const full = title.includes(SITE) ? title : `${title} · ${SITE}`
  const finalTitle = full.length > 60 ? full.slice(0, 57) + '…' : full
  document.title = finalTitle

  const desc = description
    ? (description.length > 160 ? description.slice(0, 157) + '…' : description)
    : undefined
  if (desc) upsertMeta('meta[name="description"]', 'name', 'description', desc)

  // Canonical: strip query/hash so filtered listing URLs don't fork into dupes.
  const canonical = siteOrigin() + (typeof window !== 'undefined' ? window.location.pathname : '')
  upsertCanonical(canonical)

  // Open Graph + Twitter.
  upsertMeta('meta[property="og:title"]', 'property', 'og:title', finalTitle)
  if (desc) upsertMeta('meta[property="og:description"]', 'property', 'og:description', desc)
  upsertMeta('meta[property="og:type"]', 'property', 'og:type', image ? 'product' : 'website')
  upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonical)
  upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', SITE)
  upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', image ? 'summary_large_image' : 'summary')
  upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', finalTitle)
  if (desc) upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', desc)
  if (image) {
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', image)
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image)
  }
}

/** Set page title + description (+ optional share image) for a component. */
export function useSeo(title: string, description?: string, image?: string) {
  useEffect(() => {
    applyMeta(title, description, image)
  }, [title, description, image])
}

/** Static route → meta map, applied centrally in Layout on every navigation.
 *  Dynamic detail routes (products / collection slugs) set their own meta via
 *  useSeo() and are intentionally absent here so Layout never overwrites them. */
export const ROUTE_META: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'SUVADU Notebooks — Make your mark.',
    description:
      'Premium, minimal notebooks for the thinking mind. Customisable covers, matching sets and pan-India delivery. Make your mark.',
  },
  '/collections': {
    title: 'All Collections',
    description:
      'Browse every SUVADU notebook collection — filter, sort and search premium 100 GSM notebooks across seven curated worlds.',
  },
  '/special-collections': {
    title: 'Special Collections',
    description:
      'Matching sets and personalised notebooks — Match & Write, Made For You and Create & Carry. Make it unmistakably yours.',
  },
  '/accessories': {
    title: 'Accessories',
    description: 'Bookmarks and finishing touches to pair with your SUVADU notebooks.',
  },
  '/about': {
    title: 'About Us',
    description:
      'The SUVADU story — premium notebooks crafted for the thinking mind, made to help you make your mark.',
  },
  '/contact': {
    title: 'Contact',
    description: 'Get in touch with SUVADU — WhatsApp, email and social. We usually reply within a day.',
  },
  '/faq': {
    title: 'FAQ',
    description: 'Answers on shipping, customization, returns, payments and orders for SUVADU Notebooks.',
  },
  '/cart': {
    title: 'Your Cart',
    description: 'Review your SUVADU notebooks and proceed to a secure Razorpay checkout.',
  },
  '/checkout': {
    title: 'Checkout',
    description: 'Secure checkout for your SUVADU order — UPI, cards and net banking via Razorpay.',
  },
  '/account': {
    title: 'My Account',
    description: 'Manage your SUVADU profile, orders, addresses, customizations and wishlist.',
  },
  '/account/wishlist': {
    title: 'My Wishlist',
    description: 'Your saved SUVADU notebooks — add them to your cart any time.',
  },
  '/privacy-policy': {
    title: 'Privacy Policy',
    description: 'How SUVADU Notebooks collects, uses and protects your personal information.',
  },
  '/terms': {
    title: 'Terms & Conditions',
    description: 'The terms governing your use of the SUVADU Notebooks website and store.',
  },
  '/shipping-policy': {
    title: 'Shipping Policy',
    description: 'Shipping timelines, charges and pan-India delivery details for SUVADU orders.',
  },
  '/refund-policy': {
    title: 'Return & Refund Policy',
    description: 'Returns, refunds and cancellations for SUVADU Notebooks orders.',
  },
}
