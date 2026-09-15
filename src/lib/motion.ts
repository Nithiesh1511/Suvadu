import { useEffect } from 'react'

/**
 * Scroll-reveal motion, ported from the reference storefront (bluenova.in),
 * which runs Shopify Dawn's `animations.js`. Same vocabulary, same numbers:
 *
 *   slide-in  translateY(2rem) → 0 with opacity .01 → 1
 *   fade-in   opacity .01 → 1
 *   both      0.6s cubic-bezier(0, 0, .3, 1)
 *   cascade   every [data-cascade] sibling delayed a further 75ms
 *   trigger   IntersectionObserver, rootMargin '0px 0px -50px 0px'
 *
 * Two deliberate differences, both because this is a React SPA and Dawn is a
 * server-rendered theme that only ever boots once:
 *
 *  1. The polarity is inverted. Dawn paints elements visible and lets the
 *     observer's first callback hide the ones below the fold. That only works
 *     when the script runs before first paint; here React has already painted
 *     by the time an effect runs, so every below-fold section would flash in
 *     and back out. We start hidden and mark each element as it arrives.
 *  2. A MutationObserver picks up nodes that mount later. Dawn scans once on
 *     DOMContentLoaded; our grids only exist after the Supabase fetch resolves,
 *     and the whole page is replaced on every route change.
 *
 * The reference also ships Dawn's scroll-zoom trigger (`animate--zoom-in`) but
 * never uses it on any section, so it isn't ported.
 */

/** Marks an element as revealed-on-scroll. Pair with a variant class. */
const TRIGGER_CLASS = 'scroll-trigger'
/** Set once the element has scrolled into view; the CSS animates off this. An
 *  attribute rather than a class because React rewrites `className` wholesale
 *  whenever it changes, which would drop a class we added behind its back and
 *  snap an already-revealed element back to invisible. React never rendered
 *  this attribute, so it leaves it alone. */
const IN_ATTR = 'data-sa-in'
/** Dawn staggers without limit. A 40-product grid would leave the last card
 *  three seconds behind the first, so the delay stops climbing after this. */
const MAX_CASCADE_ORDER = 8

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Position of `el` among the siblings that also opted into the cascade. */
function cascadeOrder(el: Element): number {
  const parent = el.parentElement
  if (!parent) return 0
  let order = 0
  for (const sibling of Array.from(parent.children)) {
    if (sibling === el) break
    if (sibling.hasAttribute('data-cascade')) order += 1
  }
  return Math.min(order, MAX_CASCADE_ORDER)
}

function onIntersection(entries: IntersectionObserverEntry[], observer: IntersectionObserver) {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue
    const el = entry.target as HTMLElement
    if (el.hasAttribute('data-cascade')) {
      el.style.setProperty('--animation-order', String(cascadeOrder(el)))
    }
    el.setAttribute(IN_ATTR, '')
    // Reveal is one-way: nothing re-hides on the way back up.
    observer.unobserve(el)
  }
}

/**
 * Observe every not-yet-observed trigger in `root`, `root` itself included.
 *
 * `seen` belongs to one observer generation and is passed in rather than
 * recorded on the element, which matters more than it looks: StrictMode mounts
 * effects twice in development, so the first observer is created, handed every
 * trigger on the page, and then disconnected. Bookkeeping that outlived it
 * would make the second observer skip all of those elements as "already
 * handled" and leave them stranded at opacity 0 for good — which is exactly
 * what happened to every block that was already on the page at first paint.
 */
function observeTree(root: Element | Document, observer: IntersectionObserver, seen: WeakSet<Element>) {
  const consider = (el: Element) => {
    // Anything already revealed stays revealed; re-observing it would replay
    // the entrance on a re-scan.
    if (seen.has(el) || el.hasAttribute(IN_ATTR)) return
    seen.add(el)
    observer.observe(el)
  }
  if (root instanceof Element && root.classList.contains(TRIGGER_CLASS)) consider(root)
  root.querySelectorAll(`.${TRIGGER_CLASS}`).forEach(consider)
}

/**
 * Starts the reveal observers for the lifetime of the app. Mount once, in the
 * layout — the MutationObserver covers route changes and late-arriving data,
 * so pages don't have to re-arm anything themselves.
 */
export function useScrollAnimations(): void {
  useEffect(() => {
    // With reduced motion the CSS already leaves everything visible; there is
    // nothing to observe and no reason to keep two observers alive.
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return

    const seen = new WeakSet<Element>()
    const io = new IntersectionObserver(onIntersection, { rootMargin: '0px 0px -50px 0px' })
    observeTree(document, io, seen)

    const mo = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (node.nodeType === Node.ELEMENT_NODE) observeTree(node as Element, io, seen)
        }
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      io.disconnect()
      mo.disconnect()
    }
  }, [])
}

/* ── Class helpers ────────────────────────────────────────────────────────────
   Used as plain strings so they compose with the Tailwind classes already on an
   element: `className={cn(REVEAL, 'group rounded-2xl …')}`. */

/** Rises 2rem into place as it enters the viewport. The default. */
export const REVEAL = 'scroll-trigger animate--slide-in'
/** Fades in without moving — for bands that already carry their own motion. */
export const REVEAL_FADE = 'scroll-trigger animate--fade-in'
/** Spread onto siblings in a grid or list to stagger them 75ms apart. */
export const CASCADE = { 'data-cascade': '' } as const

/**
 * Set as early as the bundle is evaluated — before React's first paint — so the
 * "hidden until revealed" rules only ever apply when this module is live. If
 * the script fails to load, or the visitor asked for reduced motion, the page
 * renders plainly instead of leaving content stuck at opacity 0.
 */
if (typeof document !== 'undefined' && !prefersReducedMotion()) {
  document.documentElement.classList.add('js-anim')
}
