import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Stars from './Stars'
import { ChevronRight, Close, Sparkle } from './Icons'
import { cn } from '@/lib/utils'

export interface Testimonial {
  name: string
  rating: number
  text: string
  location: string
}

/** One printed position on the ribbon. `key` is the review's index in the source
 *  list, shared by every copy of it, so the dialog opens the same review from
 *  either half of the loop. */
interface Slot {
  review: Testimonial
  key: number
}

/** Deterministic swatch per reviewer, so the same person keeps the same disc
 *  colour wherever they appear along the ribbon. */
const SWATCHES = ['#613092', '#7D45AE', '#4E2675', '#9A66C7', '#3A1C58']
function swatch(name: string) {
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return SWATCHES[sum % SWATCHES.length]
}
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (w[0] ?? '').toUpperCase())
    .join('')
}

function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-body font-medium text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(140deg, ${swatch(name)} 0%, #2C1A3E 130%)`,
      }}
    >
      {initials(name)}
    </span>
  )
}

/** Drift speed in px/sec. A card plus its gap is ~288px, so this reads as one
 *  card every eleven seconds — an unhurried pace you can read along with rather
 *  than one that walks a card out of view mid-sentence. */
const DRIFT = 26
/** How long the drift stays out of the way after a deliberate nudge, so a
 *  smooth-scroll or a touch flick can finish without the clock fighting it. */
const YIELD_MS = 800

/** One quote chip: a teaser that opens the full review. Every chip is the same
 *  width, so the ribbon's two halves stay identical and the loop stays seamless. */
function Chip({ review, onOpen, focusable }: {
  review: Testimonial
  onOpen: () => void
  focusable: boolean
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      // The mirror half is aria-hidden, so its buttons must leave the tab order
      // too — a focusable node inside aria-hidden is a dead end for a reader.
      tabIndex={focusable ? 0 : -1}
      aria-label={`Read the full review by ${review.name}`}
      className={cn(
        'group/chip relative flex h-[13.5rem] w-[16rem] shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 text-left shadow-card sm:w-[17rem]',
        'transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        'hover:-translate-y-1.5 hover:border-royal/30 hover:shadow-lift focus-visible:-translate-y-1.5 focus-visible:border-royal/30',
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-9 right-2 font-display text-[6rem] leading-none text-lilac transition-colors duration-300 group-hover/chip:text-royal/10"
      >
        ”
      </span>

      <span className="relative flex items-center gap-3">
        <Avatar name={review.name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm text-plum">{review.name}</span>
          <span className="block truncate font-body text-[11px] text-muted-foreground">
            {review.location || 'India'}
          </span>
        </span>
        <Stars rating={review.rating} size={13} />
      </span>

      <span className="relative mt-4 flex-1 font-body text-sm font-light leading-relaxed text-plum/90 line-clamp-4">
        “{review.text}”
      </span>

      {/* The whole chip has always opened the full review; this says so out
          loud, so a clipped quote reads as an invitation rather than a
          dead end. */}
      <span className="relative mt-3 flex items-center gap-1.5 border-t border-border pt-3 font-body text-xs font-medium text-royal">
        Read it all
        <ChevronRight
          width={12}
          className="transition-transform duration-300 group-hover/chip:translate-x-1"
        />
      </span>
    </button>
  )
}

/** The full review, opened from a chip's "Read it all". Nothing is truncated
 *  here — this is where a long review finally gets to be read whole — and the
 *  reader can walk the rest of the deck without going back to the ribbon. */
const dialogArrow = 'grid h-9 w-9 shrink-0 place-items-center rounded-full border border-royal/25 text-royal transition hover:border-royal hover:bg-royal hover:text-white active:scale-95'

function ReviewDialog({ reviews, index, onClose, onStep, onJump }: {
  reviews: Testimonial[]
  index: number
  onClose: () => void
  onStep: (direction: 1 | -1) => void
  onJump: (index: number) => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const review = reviews[index]

  // A long review is a piece of reading, not a pull-quote: past a certain
  // length it drops out of display type into body type with open leading,
  // which is what makes it comfortable rather than merely large.
  const long = review.text.length > 300
  const paragraphs = useMemo(
    () => review.text.split(/\n+/).map((line) => line.trim()).filter(Boolean),
    [review.text],
  )

  // Stepping to the next review must start it at the top, not wherever the
  // previous one was left scrolled to.
  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 })
  }, [index])

  useEffect(() => {
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); onStep(-1) }
      if (e.key === 'ArrowRight') { e.preventDefault(); onStep(1) }
    }
    document.addEventListener('keydown', onKey)
    // The page must not scroll behind an open dialog.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose, onStep])

  return (
    <div
      className="fixed inset-0 z-50 grid animate-fade-in place-items-center bg-plum/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Review by ${review.name}`}
        tabIndex={-1}
        // The backdrop closes on click, so the panel has to keep its own clicks
        // to itself.
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[85vh] w-full max-w-lg animate-fade-up overflow-y-auto rounded-[1.75rem] border border-royal/15 bg-card p-7 shadow-lift outline-none sm:p-9"
      >
        <span aria-hidden className="pointer-events-none absolute -top-10 right-3 font-display text-[9rem] leading-none text-lilac">”</span>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close review"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-royal/15 bg-white/80 text-royal transition hover:border-royal hover:bg-royal hover:text-white"
        >
          <Close width={15} />
        </button>

        <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2 pr-12">
          <Stars rating={review.rating} size={18} />
          <span className="badge-soft gap-1.5">
            <Sparkle width={13} /> Verified buyer
          </span>
        </div>

        <blockquote
          className={cn(
            'relative mt-6',
            long
              ? 'font-body text-[0.95rem] font-light leading-[1.85] text-plum/90 sm:text-base'
              : 'font-display text-xl leading-snug text-plum sm:text-2xl',
          )}
        >
          {paragraphs.map((line, i) => (
            <p key={i} className={i ? 'mt-4' : undefined}>
              {i === 0 && '“'}
              {line}
              {i === paragraphs.length - 1 && '”'}
            </p>
          ))}
        </blockquote>

        <div className="relative mt-7 flex items-center gap-4 border-t border-border pt-5">
          <Avatar name={review.name} size={46} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-base text-plum">{review.name}</span>
            <span className="block truncate font-body text-xs text-muted-foreground">{review.location || 'India'}</span>
          </span>
        </div>

        {reviews.length > 1 && (
          <div className="relative mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => onStep(-1)}
              aria-label="Previous review"
              className={dialogArrow}
            >
              <ChevronRight width={15} className="rotate-180" />
            </button>

            {/* Dots only while they still read as a row: past that they stop
                being a map and start being a fence, so a plain count says
                more in less space. */}
            {reviews.length > 8 ? (
              <span className="min-w-[5rem] text-center font-body text-xs tracking-wide text-muted-foreground">
                {index + 1} <span className="text-royal/40">/</span> {reviews.length}
              </span>
            ) : (
            <div className="flex items-center">
              {reviews.map((r, i) => (
                // The dot stays 8px but the button around it is a real target:
                // padding gives it ~40×16px to be tapped by, which a bare 8px
                // dot would never offer a thumb.
                <button
                  key={`${r.name}-${i}`}
                  type="button"
                  onClick={() => onJump(i)}
                  aria-label={`Review ${i + 1} of ${reviews.length}, by ${r.name}`}
                  aria-current={i === index}
                  className="group/dot grid place-items-center px-1.5 py-3"
                >
                  {/* The active dot stretches into a pill rather than only
                      changing colour, so position reads at a glance. */}
                  <span
                    className={cn(
                      'h-2 rounded-full transition-all duration-300',
                      i === index ? 'w-6 bg-royal' : 'w-2 bg-royal/25 group-hover/dot:bg-royal/50',
                    )}
                  />
                </button>
              ))}
            </div>
            )}

            <button
              type="button"
              onClick={() => onStep(1)}
              aria-label="Next review"
              className={dialogArrow}
            >
              <ChevronRight width={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/** "Kind words" as a single ribbon the reader can take hold of: it drifts on its
 *  own, stops under the pointer, scrubs with a drag (with momentum on release),
 *  nudges a card at a time from the arrows or ← →, and hands any chip off to the
 *  full-review dialog. The drift is driven off scrollLeft rather than a CSS
 *  transform precisely so that native scrolling, touch flicks and the drag all
 *  act on the same thing and never fight each other. */
export default function Testimonials({ reviews }: { reviews: Testimonial[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

  // Refs, not state: the animation loop reads these every frame and must never
  // re-render to see a change.
  const paused = useRef(false)
  const held = useRef(false)
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, scroll: 0, moved: 0 })
  const lastMove = useRef({ t: 0, scroll: 0 })
  const velocity = useRef(0)
  const yieldUntil = useRef(0)
  const suppressClick = useRef(false)
  const trigger = useRef<HTMLElement | null>(null)

  const count = reviews.length
  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  // The ribbon has to out-measure the widest viewport or its seam shows up mid
  // screen, so a short review list is cycled until one half is long enough.
  const slots = useMemo(() => {
    const out: Slot[] = []
    if (!count) return out
    while (out.length < 8) reviews.forEach((review, key) => out.push({ review, key }))
    return out
  }, [reviews, count])

  // Auto-drift + wrap-around + post-drag momentum, all as one rAF loop.
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp || !count) return
    let raf = 0
    let last = performance.now()

    const frame = (now: number) => {
      const dt = Math.min(now - last, 50) // a backgrounded tab must not lurch
      last = now
      const half = vp.scrollWidth / 2

      if (dragging.current) {
        // The pointer owns scrollLeft this frame; just keep the wrap honest.
        if (half > 0) {
          if (vp.scrollLeft >= half) vp.scrollLeft -= half
          else if (vp.scrollLeft <= 0) vp.scrollLeft += half
        }
      } else if (Math.abs(velocity.current) > 4) {
        vp.scrollLeft += (velocity.current * dt) / 1000
        velocity.current *= Math.pow(0.94, dt / 16) // ~flick decay
      } else if (!paused.current && !held.current && !reduceMotion && now >= yieldUntil.current) {
        vp.scrollLeft += (DRIFT * dt) / 1000
      }

      // Wrapping is skipped mid-nudge: a smooth scroll that gets teleported
      // half a track sideways just aborts.
      if (half > 0 && !dragging.current && now >= yieldUntil.current) {
        if (vp.scrollLeft >= half) vp.scrollLeft -= half
        else if (vp.scrollLeft <= 0) vp.scrollLeft += half
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [count, reduceMotion])

  /** Step one card, and stand the drift down while the smooth scroll runs. */
  const nudge = useCallback((direction: 1 | -1) => {
    const vp = viewportRef.current
    if (!vp) return
    velocity.current = 0
    yieldUntil.current = performance.now() + YIELD_MS
    const card = vp.querySelector('button')?.getBoundingClientRect().width ?? 280
    vp.scrollBy({ left: direction * (card + 16), behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [reduceMotion])

  const openReview = (key: number) => {
    if (suppressClick.current) { suppressClick.current = false; return }
    trigger.current = document.activeElement as HTMLElement | null
    held.current = true // the ribbon holds still behind the dialog
    setOpen(key)
  }
  const closeReview = useCallback(() => {
    held.current = false
    setOpen(null)
    trigger.current?.focus?.()
  }, [])
  const stepReview = useCallback((direction: 1 | -1) => {
    setOpen((cur) => (cur === null ? cur : (cur + direction + count) % count))
  }, [count])

  const onPointerDown = (e: React.PointerEvent) => {
    const vp = viewportRef.current
    if (!vp) return
    paused.current = true
    velocity.current = 0
    // Touch and pen get the browser's own scrolling, which already feels right;
    // only a mouse needs us to synthesise the drag.
    if (e.pointerType !== 'mouse') { yieldUntil.current = performance.now() + YIELD_MS; return }
    if (e.button !== 0) return
    dragging.current = true
    dragStart.current = { x: e.clientX, scroll: vp.scrollLeft, moved: 0 }
    lastMove.current = { t: performance.now(), scroll: vp.scrollLeft }
    // Capture, so a drag that wanders off the strip still tracks the pointer
    // and still gets its pointerup.
    vp.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const vp = viewportRef.current
    if (!vp || !dragging.current) return
    const dx = e.clientX - dragStart.current.x
    dragStart.current.moved = Math.max(dragStart.current.moved, Math.abs(dx))
    vp.scrollLeft = dragStart.current.scroll - dx

    // Velocity in px/sec of scrollLeft travel, measured against the clock rather
    // than assuming a frame interval — that's what makes the flick feel true.
    const now = performance.now()
    const dt = now - lastMove.current.t
    if (dt > 0) {
      velocity.current = ((vp.scrollLeft - lastMove.current.scroll) / dt) * 1000
      lastMove.current = { t: now, scroll: vp.scrollLeft }
    }
  }

  const endDrag = (e: React.PointerEvent) => {
    paused.current = false
    if (!dragging.current) {
      if (e.pointerType !== 'mouse') yieldUntil.current = performance.now() + YIELD_MS
      return
    }
    dragging.current = false
    const vp = viewportRef.current
    if (vp?.hasPointerCapture(e.pointerId)) vp.releasePointerCapture(e.pointerId)

    // Let go after holding still and there is no flick to carry over, however
    // fast the pointer was moving a moment earlier.
    const now = performance.now()
    if (now - lastMove.current.t > 80) velocity.current = 0
    velocity.current = Math.max(-2500, Math.min(2500, velocity.current))

    // A drag that travelled must not also register as a click on the chip it
    // happened to finish over.
    suppressClick.current = dragStart.current.moved > 6
    yieldUntil.current = now + 300
  }

  if (!count) return null

  const arrow = 'grid h-11 w-11 place-items-center rounded-full border border-royal/20 bg-white/85 text-royal shadow-soft backdrop-blur transition hover:border-royal hover:bg-royal hover:text-white active:scale-95'

  return (
    <div>
      {/* Full-bleed on purpose: the ribbon should run off both edges. */}
      <div
        className="group/band relative rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-royal/35"
        role="region"
        aria-roledescription="carousel"
        aria-label="Customer reviews"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(-1) }
          if (e.key === 'ArrowRight') { e.preventDefault(); nudge(1) }
        }}
        onMouseEnter={() => { paused.current = true }}
        onMouseLeave={() => { paused.current = false }}
        onFocus={() => { paused.current = true }}
        onBlur={() => { paused.current = false }}
      >
        <div
          ref={viewportRef}
          className="no-scrollbar mask-fade-x cursor-grab overflow-x-auto overscroll-x-contain py-3 active:cursor-grabbing"
          style={{ touchAction: 'pan-x pan-y' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onWheel={() => { yieldUntil.current = performance.now() + YIELD_MS }}
        >
          <div className="flex w-max">
            {[0, 1].map((copy) => (
              // The trailing gap lives inside each half (`pr-4`) and the outer
              // flex has none of its own — any gap between the halves would make
              // the two 50%s unequal and the wrap would visibly jump.
              <div key={copy} aria-hidden={copy === 1} className="flex shrink-0 gap-4 pr-4">
                {slots.map(({ review, key }, i) => (
                  <Chip
                    key={`${copy}-${i}`}
                    review={review}
                    onOpen={() => openReview(key)}
                    focusable={copy === 0}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Arrows ride the faded edges; they surface on hover on desktop and
            stay put for keyboard users. Touch just swipes. */}
        <div className="pointer-events-none absolute inset-y-0 left-2 hidden items-center sm:flex lg:left-6">
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label="Show previous reviews"
            className={cn(arrow, 'pointer-events-auto opacity-0 transition-opacity group-hover/band:opacity-100 focus-visible:opacity-100')}
          >
            <ChevronRight width={18} className="rotate-180" />
          </button>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-2 hidden items-center sm:flex lg:right-6">
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label="Show more reviews"
            className={cn(arrow, 'pointer-events-auto opacity-0 transition-opacity group-hover/band:opacity-100 focus-visible:opacity-100')}
          >
            <ChevronRight width={18} />
          </button>
        </div>
      </div>
      
      {open !== null && (
        <ReviewDialog reviews={reviews} index={open} onClose={closeReview} onStep={stepReview} onJump={setOpen} />
      )}
    </div>
  )
}
