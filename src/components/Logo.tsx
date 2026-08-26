import { cn } from '@/lib/utils'
import wordmark from '@/assets/suvadu-logo.jpg'

/**
 * The Suvadu script wordmark.
 *
 * The source art is a JPG on a white ground, so `mix-blend-multiply` drops the
 * white and lets whatever is behind it show through (the warm page background,
 * the lilac footer gradient). Size it with a height class — width follows.
 */
export default function Logo({ className }: { className?: string }) {
  return (
    <img
      src={wordmark}
      alt="Suvadu"
      width={800}
      height={246}
      draggable={false}
      className={cn('h-8 w-auto select-none mix-blend-multiply', className)}
    />
  )
}
