// ── Google Analytics 4 (Dev Brief §10.6) ─────────────────────────────────────
// Loads GA4 only when VITE_GA4_ID is set, so the site works with or without it.
// Add your Measurement ID (G-XXXXXXX) to .env.local: VITE_GA4_ID=G-XXXXXXX

const GA_ID = import.meta.env.VITE_GA4_ID as string | undefined
let loaded = false

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export const gaEnabled = Boolean(GA_ID)

/** Inject the gtag.js script once. No-op if no ID configured. */
export function initGA(): void {
  if (!GA_ID || loaded || typeof window === 'undefined') return
  loaded = true
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(s)
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // GA expects the raw arguments object pushed to the dataLayer.
    window.dataLayer!.push(arguments)
  }
  window.gtag('js', new Date())
  // We send page_view manually on route change (SPA).
  window.gtag('config', GA_ID, { send_page_view: false })
}

export function trackPageview(path: string): void {
  if (!GA_ID || !window.gtag) return
  window.gtag('event', 'page_view', { page_path: path, page_location: window.location.href })
}

export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (!GA_ID || !window.gtag) return
  window.gtag('event', name, params ?? {})
}
