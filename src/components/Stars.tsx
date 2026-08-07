import { Star } from './Icons'
import { cn } from '@/lib/utils'

export default function Stars({ rating, size = 16, showValue = false, className }: {
  rating: number
  size?: number
  showValue?: boolean
  className?: string
}) {
  const rounded = Math.round(rating)
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-amber-500', className)} aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} width={size} height={size} filled={i < rounded} className={i < rounded ? '' : 'text-amber-300'} />
      ))}
      {showValue && <span className="ml-1.5 font-body text-xs font-medium text-muted-foreground">{rating.toFixed(1)}</span>}
    </span>
  )
}
