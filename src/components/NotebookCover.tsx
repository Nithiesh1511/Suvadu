import type { Pattern } from '@/data/products'
import { cn } from '@/lib/utils'

interface Props {
  colour: string
  pattern: Pattern
  label?: string
  customText?: string
  customFont?: string
  className?: string
  rounded?: boolean
}

/**
 * Generates an elegant notebook "cover" as inline SVG/CSS — no external image
 * assets required, so the storefront looks polished and consistent everywhere.
 * Mimics the role of the brief's product imagery / ImageWithFallback wrapper.
 */
export default function NotebookCover({
  colour,
  pattern,
  label,
  customText,
  customFont,
  className,
  rounded = true,
}: Props) {
  // Pick a readable ink colour for the given cover colour.
  const dark = isDark(colour)
  const ink = dark ? 'rgba(255,255,255,0.92)' : 'rgba(44,26,62,0.8)'
  const inkSoft = dark ? 'rgba(255,255,255,0.35)' : 'rgba(44,26,62,0.28)'

  return (
    <div
      className={cn(
        'relative isolate flex aspect-[3/4] w-full items-center justify-center overflow-hidden',
        rounded && 'rounded-2xl',
        className,
      )}
      style={{ backgroundColor: colour }}
      aria-hidden
    >
      {/* spine */}
      <span
        className="absolute inset-y-0 left-[7%] w-[3px] rounded-full"
        style={{ background: inkSoft }}
      />
      {/* elastic band hint */}
      <span
        className="absolute inset-y-0 right-[14%] w-[6px]"
        style={{ background: dark ? 'rgba(255,255,255,0.12)' : 'rgba(44,26,62,0.07)' }}
      />

      <Pattern pattern={pattern} ink={inkSoft} />

      {/* center plate / label */}
      <div className="relative z-10 mx-6 max-w-[78%] text-center">
        {customText ? (
          <span
            className="block text-balance text-lg leading-tight sm:text-xl"
            style={{ color: ink, fontFamily: fontFor(customFont) }}
          >
            {customText}
          </span>
        ) : (
          <>
            <span
              className="block font-display text-base leading-tight tracking-wide sm:text-lg"
              style={{ color: ink }}
            >
              SUVADU
            </span>
            {label && (
              <span
                className="mt-1 block font-body text-[10px] uppercase tracking-[0.25em]"
                style={{ color: inkSoft }}
              >
                {label}
              </span>
            )}
          </>
        )}
      </div>

      {/* subtle sheen */}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/25" />
    </div>
  )
}

function Pattern({ pattern, ink }: { pattern: Pattern; ink: string }) {
  const common = 'absolute inset-0 h-full w-full opacity-70'
  switch (pattern) {
    case 'dots':
      return (
        <svg className={common} aria-hidden>
          <pattern id="d" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.6" fill={ink} />
          </pattern>
          <rect width="100%" height="100%" fill="url(#d)" />
        </svg>
      )
    case 'lines':
      return (
        <svg className={common} aria-hidden>
          <pattern id="l" width="100%" height="20" patternUnits="userSpaceOnUse">
            <line x1="0" y1="19" x2="100%" y2="19" stroke={ink} strokeWidth="1" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#l)" />
        </svg>
      )
    case 'wave':
      return (
        <svg className={common} viewBox="0 0 120 160" preserveAspectRatio="none" aria-hidden>
          {[20, 50, 80, 110, 140].map((y) => (
            <path key={y} d={`M0 ${y} Q30 ${y - 14} 60 ${y} T120 ${y}`} fill="none" stroke={ink} strokeWidth="1.4" />
          ))}
        </svg>
      )
    case 'floral':
      return (
        <svg className={common} viewBox="0 0 120 160" aria-hidden>
          {[
            [30, 40], [90, 60], [55, 110], [95, 130], [20, 120],
          ].map(([cx, cy], i) => (
            <g key={i} stroke={ink} strokeWidth="1.2" fill="none">
              {[0, 60, 120, 180, 240, 300].map((a) => (
                <ellipse key={a} cx={cx} cy={cy} rx="3" ry="8" transform={`rotate(${a} ${cx} ${cy})`} />
              ))}
            </g>
          ))}
        </svg>
      )
    case 'kids':
      return (
        <svg className={common} viewBox="0 0 120 160" aria-hidden>
          {[[25, 30], [80, 45], [45, 80], [95, 100], [30, 120]].map(([cx, cy], i) => (
            <g key={i} stroke={ink} strokeWidth="1.4" fill="none">
              <path d={`M${cx} ${cy} l4 4 4-4`} />
              <circle cx={cx + 4} cy={cy + 12} r="4" />
            </g>
          ))}
        </svg>
      )
    case 'stars':
      return (
        <svg className={common} viewBox="0 0 120 160" aria-hidden>
          {[[25, 30], [80, 45], [45, 80], [95, 100], [30, 120], [70, 135]].map(([cx, cy], i) => (
            <path key={i} d={`M${cx} ${cy - 5} l1.5 3.5 3.8.4-2.9 2.5.9 3.7L${cx} ${cy + 1.5}l-3.2 1.6.9-3.7-2.9-2.5 3.8-.4z`} fill={ink} stroke="none" />
          ))}
        </svg>
      )
    case 'mono':
      return (
        <svg className={common} viewBox="0 0 120 160" aria-hidden>
          <rect x="20" y="20" width="80" height="120" fill="none" stroke={ink} strokeWidth="1.4" />
          <rect x="32" y="34" width="56" height="92" fill="none" stroke={ink} strokeWidth="1" />
        </svg>
      )
    default:
      return null
  }
}

function fontFor(name?: string) {
  switch (name) {
    case 'DM Sans': return "'DM Sans', sans-serif"
    case 'Modern Mono': return 'ui-monospace, monospace'
    case 'Classic Script':
    case 'Elegant Italic': return "italic 1em 'DM Serif Display', serif"
    default: return "'DM Serif Display', serif"
  }
}

function isDark(hex: string): boolean {
  const c = hex.replace('#', '')
  if (c.length < 6) return false
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  // relative luminance
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5
}
