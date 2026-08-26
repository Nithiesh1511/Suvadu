import { useEffect, useState } from 'react'
import { supabase, type ReviewRow } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/Toast'
import Stars from '@/components/Stars'
import { cn } from '@/lib/utils'

// Approved reviews for a product + a submit form for signed-in shoppers
// (submissions land as 'pending' for admin moderation).
export default function ProductReviews({ productId }: { productId: string }) {
  const { session, profile } = useAuth()
  const { notify } = useToast()
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    supabase.from('reviews').select('*').eq('product_id', productId).eq('status', 'approved').order('created_at', { ascending: false }).then(({ data }) => {
      if (!active) return
      setReviews((data as ReviewRow[]) ?? [])
      setLoading(false)
    })
    return () => { active = false }
  }, [productId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) { notify('Please write a few words for your review.'); return }
    setBusy(true)
    const author = profile?.name || profile?.email?.split('@')[0] || 'Suvadu customer'
    const { error } = await supabase.from('reviews').insert({ product_id: productId, author_name: author, rating, text: text.trim(), status: 'pending' })
    setBusy(false)
    if (error) { notify(`Could not submit: ${error.message}`); return }
    setText(''); setRating(5)
    notify('Thanks! Your review is pending approval.')
  }

  // scroll-mt clears the sticky header when the product page's rating link jumps here.
  return (
    <section id="reviews" className="scroll-mt-24 border-t border-border bg-lilac/20 py-12 sm:py-14">
      <div className="container-suvadu grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="font-display text-2xl text-plum sm:text-3xl">Customer reviews</h2>
          {loading ? (
            <p className="mt-4 font-body text-sm font-light text-muted-foreground">Loading…</p>
          ) : reviews.length === 0 ? (
            <p className="mt-4 font-body text-sm font-light text-muted-foreground">No reviews yet — be the first to share yours.</p>
          ) : (
            <div className="mt-6 space-y-4">
              {reviews.map((r) => (
                <figure key={r.id} className="card-surface p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-display text-base text-plum">{r.author_name}</span>
                    <Stars rating={r.rating} />
                  </div>
                  <blockquote className="mt-2 break-anywhere font-body text-sm font-light leading-relaxed text-plum/80">“{r.text}”</blockquote>
                </figure>
              ))}
            </div>
          )}
        </div>

        <div className="h-fit">
          <div className="card-surface p-6">
            <h3 className="font-display text-xl text-plum">Write a review</h3>
            {session ? (
              <form onSubmit={submit} className="mt-4 space-y-4">
                <div>
                  <span className="mb-1.5 block font-body text-xs font-medium uppercase tracking-wide text-plum">Rating</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star`} className={cn('text-2xl leading-none transition', n <= rating ? 'text-royal' : 'text-border hover:text-royal/50')}>★</button>
                    ))}
                  </div>
                </div>
                <label className="block">
                  <span className="mb-1.5 block font-body text-xs font-medium uppercase tracking-wide text-plum">Your review</span>
                  <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="What did you love?" className="field resize-none" />
                </label>
                <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? 'Submitting…' : 'Submit review'}</button>
              </form>
            ) : (
              <p className="mt-3 font-body text-sm font-light text-muted-foreground">Please sign in to write a review.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
