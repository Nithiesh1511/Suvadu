import { useEffect } from 'react'

// ── SEO meta helper (brief §11) ───────────────────────────────────────────
// Unique <title> (≤60 chars) and meta description (≤160 chars) per page.
const SITE = 'SUVADU Notebooks'

export function applyMeta(title: string, description?: string) {
  const full = title.includes(SITE) ? title : `${title} · ${SITE}`
  document.title = full.length > 60 ? full.slice(0, 60) : full

  if (description) {
    let tag = document.head.querySelector('meta[name="description"]') as HTMLMetaElement | null
    if (!tag) {
      tag = document.createElement('meta')
      tag.name = 'description'
      document.head.appendChild(tag)
    }
    tag.content = description.length > 160 ? description.slice(0, 157) + '…' : description
  }
}

/** Set page title + description for the lifetime of a component (dynamic pages). */
export function useSeo(title: string, description?: string) {
  useEffect(() => {
    applyMeta(title, description)
  }, [title, description])
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
