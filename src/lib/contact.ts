// Single source of truth for the public contact channels. WhatsApp replaced the
// Contact page as the primary enquiry route, so this is consumed by the floating
// chat button, the FAQ fallback CTA, and the price-on-request link.
//
// The number is deliberately kept out of every rendered link. Callers use
// openWhatsApp() from a click handler, so the wa.me URL is only ever built in
// memory — it never lands in an href, which means it can't be read from the
// hover status bar, "copy link address", the DOM, or an HTML scraper.
// Splitting the digits also defeats a plain-text search of the JS bundle.
//
// NOTE: this is deterrence, not secrecy. The number is still recoverable at
// runtime by anyone with devtools. Only a server-side redirect can truly hide it.
const PHONE_PARTS = ['91', '81223', '39518'] // +91 81223 39518

export const CONTACT_EMAIL = 'suvadu.notebooks@gmail.com'

/** wa.me deep link. Intentionally NOT exported — exporting it invites putting
 *  the number back into an href, which is the thing we're avoiding. */
function whatsappLink(message?: string): string {
  const url = `https://wa.me/${PHONE_PARTS.join('')}`
  return message ? `${url}?text=${encodeURIComponent(message)}` : url
}

/** Opens WhatsApp in a new tab. Must be called from a user-initiated click so
 *  the popup isn't blocked. */
export function openWhatsApp(message?: string): void {
  window.open(whatsappLink(message), '_blank', 'noopener,noreferrer')
}
