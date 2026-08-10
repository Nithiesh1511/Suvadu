import { BOOKMARKS, type Bookmark, type Product } from '@/data/products'
import PageHeader from '@/components/PageHeader'
import { useStore } from '@/context/StoreContext'
import { useToast } from '@/components/Toast'
import { Heart } from '@/components/Icons'
import { formatINR, cn } from '@/lib/utils'

const BOOKMARK_PRICE = 99

// A bookmark is a lightweight product — build a Product so it flows through the cart.
function bookmarkToProduct(b: Bookmark): Product {
  return {
    id: b.id,
    slug: `bookmark-${b.id.toLowerCase()}`,
    name: b.name,
    type: 'basic',
    collectionSlug: 'accessories',
    collectionName: 'Accessories',
    prices: { A5: BOOKMARK_PRICE, A4: null, Custom: null },
    description: `${b.name} — a premium Suvadu bookmark to keep your place in style.`,
    specs: [],
    colour: b.colour,
    pattern: b.pattern,
    rating: 5,
    reviews: 0,
  }
}

export default function Accessories() {
  const { isWished, toggleWishlist, user, addToCart } = useStore()
  const { notify } = useToast()

  function wish(id: string) {
    if (!user) { notify('Please sign in to save to your wishlist'); return }
    const was = isWished(id)
    toggleWishlist(id)
    notify(was ? 'Removed from wishlist' : 'Saved to wishlist ♥')
  }

  function add(b: Bookmark) {
    addToCart({ product: bookmarkToProduct(b), size: 'A5', unitPrice: BOOKMARK_PRICE })
    notify(`Added ${b.name} to cart`)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Accessories"
        title="Bookmarks"
        subtitle="Little companions for your notebooks — four designs to keep your place in style."
        crumbs={[{ label: 'Accessories' }]}
      />

      <section className="container-suvadu py-12">
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {BOOKMARKS.map((b) => {
            const wished = isWished(b.id)
            return (
              <div
                key={b.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-card transition hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl" style={{ backgroundColor: b.colour.hex + '40' }}>
                  <div className="relative h-[78%] w-12 rounded-t-md shadow-card sm:w-14" style={{ backgroundColor: b.colour.hex }}>
                    <span className="absolute -bottom-3 left-0 h-0 w-0 border-x-[24px] border-t-[16px] border-x-transparent sm:border-x-[28px]" style={{ borderTopColor: b.colour.hex }} />
                    <span className="absolute left-1/2 top-3 h-2 w-2 -translate-x-1/2 rounded-full bg-white/60" />
                  </div>
                  <button
                    type="button"
                    onClick={() => wish(b.id)}
                    aria-label="Add to wishlist"
                    className={cn('absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-royal shadow-card backdrop-blur transition hover:scale-110', wished && 'text-rose-500')}
                  >
                    <Heart width={18} height={18} filled={wished} />
                  </button>
                </div>
                <div className="flex flex-1 flex-col px-1.5 pb-1.5 pt-4">
                  <h3 className="font-display text-lg text-plum">{b.name}</h3>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 font-body text-xs text-muted-foreground">
                      <span className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: b.colour.hex }} />
                      {b.colour.name}
                    </span>
                    <span className="font-body text-sm font-medium text-plum">{formatINR(BOOKMARK_PRICE)}</span>
                  </div>
                  <button onClick={() => add(b)} className="btn-primary btn-sm mt-3 w-full">Add to Cart</button>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
