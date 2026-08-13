import type { Pattern } from '@/data/products'
import NotebookCover from './NotebookCover'
import { cn } from '@/lib/utils'

interface Props {
  /** Admin-uploaded cover image (data URL). When present it's shown instead of the generated cover. */
  image?: string
  alt?: string
  // Fallback cover props (used when no image is supplied) — mirror NotebookCover.
  colour: string
  pattern: Pattern
  label?: string
  customText?: string
  customFont?: string
  className?: string
  rounded?: boolean
}

/**
 * Renders a product's cover: the admin-uploaded image when available, otherwise
 * the generated NotebookCover. Drop-in replacement for NotebookCover at product
 * call sites — pass the same cover props plus the product's optional `image`.
 */
export default function ProductImage({ image, alt, className, rounded = true, ...cover }: Props) {
  if (image) {
    return (
      <img
        src={image}
        alt={alt ?? ''}
        loading="lazy"
        decoding="async"
        width={600}
        height={800}
        className={cn('aspect-[3/4] w-full object-cover', rounded && 'rounded-2xl', className)}
      />
    )
  }
  return <NotebookCover className={className} rounded={rounded} {...cover} />
}
