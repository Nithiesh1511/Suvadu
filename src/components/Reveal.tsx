import type { ReactNode } from 'react'
import { REVEAL, REVEAL_FADE, CASCADE } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * Wraps a block so it rises into view as it is scrolled to. For elements that
 * already exist — a <Link> card, a <section>, a <figure> — reach for the REVEAL
 * / CASCADE class helpers in `@/lib/motion` instead of nesting a div around it.
 */
export default function Reveal({ children, className, fade, cascade, as: Tag = 'div' }: {
  children: ReactNode
  className?: string
  /** Fade without the 2rem rise — for bands that carry their own motion. */
  fade?: boolean
  /** Stagger against the sibling Reveals around it, 75ms apart. */
  cascade?: boolean
  as?: 'div' | 'section' | 'li' | 'article'
}) {
  return (
    <Tag className={cn(fade ? REVEAL_FADE : REVEAL, className)} {...(cascade ? CASCADE : {})}>
      {children}
    </Tag>
  )
}
