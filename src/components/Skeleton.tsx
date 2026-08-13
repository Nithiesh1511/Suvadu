// ── Loading skeletons ────────────────────────────────────────────────────────
// Lightweight placeholders shown while the catalogue loads from Supabase, so
// grids don't flash empty.

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[4/5] rounded-2xl bg-lilac/60" />
          <div className="mt-3 h-2.5 w-1/2 rounded bg-lilac/60" />
          <div className="mt-2 h-3.5 w-3/4 rounded bg-lilac/60" />
          <div className="mt-2 h-3.5 w-1/3 rounded bg-lilac/60" />
        </div>
      ))}
    </div>
  )
}

export function CollectionGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-border">
          <div className="aspect-[16/10] bg-lilac/60" />
          <div className="bg-white p-6">
            <div className="h-4 w-1/2 rounded bg-lilac/60" />
            <div className="mt-3 h-3 w-full rounded bg-lilac/50" />
            <div className="mt-2 h-3 w-2/3 rounded bg-lilac/50" />
          </div>
        </div>
      ))}
    </div>
  )
}
