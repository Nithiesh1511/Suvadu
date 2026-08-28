import { memo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Product } from '@/data/products'
import { formatINR } from '@/lib/utils'
import { useStore } from '@/context/StoreContext'
import { useToast } from './Toast'
import ProductImage from './ProductImage'
import Stars from './Stars'
import { Heart } from './Icons'
import { cn } from '@/lib/utils'

function ProductCard({ product }: { product: Product }) {
  const { isWished, toggleWishlist, user } = useStore()
  const { notify } = useToast()
  const navigate = useNavigate()
  const wished = isWished(product.id)

  function onWish(e: React.MouseEvent) {
    e.preventDefault()
    if (!user) {
      notify('Please sign in to save to your wishlist')
      navigate('/account')
      return
    }
    toggleWishlist(product.id)
    notify(wished ? 'Removed from wishlist' : 'Saved to wishlist ♥')
  }

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative overflow-hidden rounded-xl">
        <ProductImage
          image={product.image}
          alt={product.name}
          colour={product.colour.hex}
          pattern={product.pattern}
          label={product.collectionName}
          className="transition-transform duration-500 group-hover:scale-[1.04]"
        />

        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.bestseller && <span className="badge-soft bg-royal text-white">Bestseller</span>}
          {product.isNew && <span className="badge-soft bg-white/90">New</span>}
        </div>

        <button
          type="button"
          onClick={onWish}
          aria-label="Add to wishlist"
          className={cn(
            'absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-royal shadow-card backdrop-blur transition hover:scale-110',
            wished && 'text-rose-500',
          )}
        >
          <Heart width={18} height={18} filled={wished} />
        </button>

        <span className="pointer-events-none absolute inset-x-3 bottom-3 translate-y-3 rounded-full bg-white/95 py-2 text-center font-body text-xs font-medium uppercase tracking-cta text-royal opacity-0 shadow-card transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          View Product
        </span>
      </div>

      <div className="flex flex-1 flex-col px-1.5 pb-1.5 pt-4">
        <p className="font-body text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{product.collectionName}</p>
        <h3 className="mt-1 font-display text-lg leading-snug text-plum">{product.name}</h3>
        {/* No stars until there is something real to average — an unrated
            product used to show the seeded 4.9. */}
        {product.reviews > 0 && (
          <div className="mt-1.5"><Stars rating={product.rating} size={14} /></div>
        )}
        <div className="mt-auto flex items-end justify-between pt-3">
          <p className="font-body text-base font-medium text-plum">
            {formatINR(product.prices.A5)}
            <span className="ml-1 text-xs font-light text-muted-foreground">/ A5</span>
          </p>
          <span className="inline-flex items-center gap-1 font-body text-xs font-medium text-royal opacity-0 transition group-hover:opacity-100">
            {product.colour.name}
            <span className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: product.colour.hex }} />
          </span>
        </div>
      </div>
    </Link>
  )
}

// Memoized: product cards render in grids of many; a parent re-render (or an
// unrelated store change) shouldn't re-render every card when its product is
// unchanged.
export default memo(ProductCard)
