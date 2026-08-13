import { openWhatsApp } from '@/lib/contact'
import { WhatsappSolid } from './Icons'

// Pre-fills the chat so the customer doesn't start from a blank box, and so the
// team can see the enquiry came from the website.
const FIRST_MESSAGE = 'Hi Suvadu! I have a question about your notebooks.'

/**
 * Floating WhatsApp chat button, pinned bottom-right on every page.
 *
 * z-40 is deliberate: it sits under the header (z-50) and under every overlay —
 * search (70), drawer (80), zoom (90), toasts (100) — so it never floats on top
 * of a modal scrim. The toast stack is offset upward to leave this corner clear.
 *
 * A <button> rather than an <a>: the wa.me URL is built on click instead of being
 * baked into an href, so the phone number never appears in the markup.
 */
export default function WhatsAppFab() {
  return (
    <button
      type="button"
      onClick={() => openWhatsApp(FIRST_MESSAGE)}
      aria-label="Chat with us on WhatsApp"
      className="group fixed bottom-5 right-4 z-40 sm:bottom-6 sm:right-6"
    >
      {/* The bounce gets its own wrapper: it animates `transform`, and so does
          the hover scale below — on one element the animation would win and the
          scale would never apply. It also pauses on hover so the two never
          overlap, and stands down entirely for reduced-motion users. */}
      <span className="block animate-bounce-nudge group-hover:animate-none motion-reduce:animate-none">
        {/* Brand royal rather than WhatsApp green — the glyph alone carries the
            recognition, and the hover shift matches .btn-primary. */}
        <span className="grid h-14 w-14 place-items-center rounded-full bg-royal text-white shadow-lift transition-all duration-300 group-hover:scale-105 group-hover:bg-royal-700 group-active:scale-95 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
          <WhatsappSolid width={27} height={27} />
        </span>
      </span>

      {/* Hover label — pointer-only, so it never covers content on touch. */}
      <span className="pointer-events-none absolute right-full top-1/2 mr-3 hidden -translate-y-1/2 whitespace-nowrap rounded-full bg-plum px-3 py-1.5 font-body text-xs font-medium text-white opacity-0 shadow-card transition-opacity duration-200 group-hover:opacity-100 sm:block">
        Chat with us
      </span>
    </button>
  )
}
