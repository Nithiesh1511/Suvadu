import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useStore } from '@/context/StoreContext'
import { useCatalog } from '@/context/CatalogContext'
import { cn } from '@/lib/utils'
import { Search, Heart, Cart, User, Menu, Close } from './Icons'

const NAV = [
  { label: 'Home', to: '/' },
  { label: 'Collections', to: '/collections' },
  { label: 'Special Collections', to: '/special-collections' },
  { label: 'Accessories', to: '/accessories' },
  { label: 'About Us', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

export default function Header() {
  const { cartCount, wishlist } = useStore()
  const { allProducts: ALL_PRODUCTS } = useCatalog()
  const [scrolled, setScrolled] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [search, setSearch] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // lock body scroll while either overlay is open
  useEffect(() => {
    const open = drawer || search
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawer, search])

  // Close the search / menu overlays on Escape (keyboard accessibility).
  useEffect(() => {
    if (!drawer && !search) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSearch(false); setDrawer(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawer, search])

  const results = query.trim()
    ? ALL_PRODUCTS.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.collectionName.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : []

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-plum text-center text-white">
        <div className="container-suvadu flex items-center justify-center gap-2 py-2 text-[11px] font-light tracking-[0.18em]">
          <span className="uppercase">Pan-India delivery via Shiprocket  ·  Crafted in India</span>
        </div>
      </div>

      <header
        className={cn(
          'sticky top-0 z-50 w-full border-b transition-all duration-300',
          scrolled ? 'border-border bg-white/85 backdrop-blur-lg shadow-card' : 'border-transparent bg-background',
        )}
      >
        <div className="container-suvadu flex h-16 items-center justify-between gap-4 lg:h-[72px]">
          {/* Logo */}
          <Link to="/" className="shrink-0 font-display text-2xl tracking-wide text-plum">
            SUVADU
            <span className="ml-1 align-top text-royal">·</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'relative font-body text-sm tracking-wide text-plum/80 transition hover:text-royal',
                    isActive && 'text-royal',
                  )
                }
              >
                {({ isActive }) => (
                  <span className="relative">
                    {item.label}
                    <span className={cn('absolute -bottom-1.5 left-0 h-px bg-royal transition-all', isActive ? 'w-full' : 'w-0')} />
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right icons */}
          <div className="flex items-center gap-1 sm:gap-2">
            <IconBtn label="Search" onClick={() => setSearch(true)}><Search /></IconBtn>
            <IconBtn label="Wishlist" to="/account/wishlist" badge={wishlist.length}><Heart /></IconBtn>
            <IconBtn label="Cart" to="/cart" badge={cartCount}><Cart /></IconBtn>
            <IconBtn label="Account" to="/account"><User /></IconBtn>
            <button
              className="ml-1 grid h-10 w-10 place-items-center rounded-full text-plum transition hover:bg-lilac lg:hidden"
              aria-label="Open menu"
              onClick={() => setDrawer(true)}
            >
              <Menu />
            </button>
          </div>
        </div>
      </header>

      {/* Search overlay */}
      {search && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-plum/40 backdrop-blur-sm animate-fade-in" onClick={() => setSearch(false)}>
          <div className="bg-white p-5 shadow-lift sm:p-8 animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="container-suvadu">
              <form
                onSubmit={(e) => { e.preventDefault(); if (results[0]) { navigate(`/products/${results[0].slug}`); setSearch(false) } }}
                className="flex items-center gap-3 border-b border-border pb-4"
              >
                <Search className="text-royal" width={22} height={22} />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search notebooks, collections…"
                  className="w-full bg-transparent font-display text-xl text-plum outline-none placeholder:text-muted-foreground/60 sm:text-2xl"
                />
                <button type="button" aria-label="Close search" onClick={() => setSearch(false)} className="text-muted-foreground hover:text-royal"><Close /></button>
              </form>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {results.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { navigate(`/products/${p.slug}`); setSearch(false) }}
                    className="flex items-center gap-3 rounded-xl p-2 text-left transition hover:bg-lilac"
                  >
                    <span className="h-10 w-8 rounded-md" style={{ backgroundColor: p.colour.hex }} />
                    <span>
                      <span className="block font-display text-sm text-plum">{p.name}</span>
                      <span className="block font-body text-xs text-muted-foreground">{p.collectionName}</span>
                    </span>
                  </button>
                ))}
                {query.trim() && results.length === 0 && (
                  <p className="py-4 font-body text-sm text-muted-foreground">No matches for “{query}”.</p>
                )}
                {!query.trim() && (
                  <p className="py-4 font-body text-sm text-muted-foreground">Try “calm”, “midnight”, “floral”…</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile drawer */}
      <div className={cn('fixed inset-0 z-[80] lg:hidden', drawer ? 'pointer-events-auto' : 'pointer-events-none')}>
        <div className={cn('absolute inset-0 bg-plum/50 transition-opacity', drawer ? 'opacity-100' : 'opacity-0')} onClick={() => setDrawer(false)} />
        <aside className={cn('absolute right-0 top-0 flex h-full w-[82%] max-w-xs flex-col bg-white shadow-lift transition-transform duration-300', drawer ? 'translate-x-0' : 'translate-x-full')}>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="font-display text-xl text-plum">SUVADU</span>
            <button aria-label="Close menu" onClick={() => setDrawer(false)} className="grid h-9 w-9 place-items-center rounded-full text-plum hover:bg-lilac"><Close /></button>
          </div>
          <nav className="flex flex-col p-3">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setDrawer(false)}
                className={({ isActive }) => cn('rounded-xl px-4 py-3.5 font-body text-base text-plum transition hover:bg-lilac', isActive && 'bg-lilac text-royal')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border p-4">
            <Link to="/account/wishlist" onClick={() => setDrawer(false)} className="btn-secondary">Wishlist</Link>
            <Link to="/cart" onClick={() => setDrawer(false)} className="btn-primary">Cart ({cartCount})</Link>
          </div>
        </aside>
      </div>
    </>
  )
}

function IconBtn({ children, label, to, onClick, badge }: {
  children: React.ReactNode
  label: string
  to?: string
  onClick?: () => void
  badge?: number
}) {
  const inner = (
    <span className="relative grid h-10 w-10 place-items-center rounded-full text-plum transition hover:bg-lilac hover:text-royal">
      {children}
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 grid h-4.5 min-w-[18px] place-items-center rounded-full bg-royal px-1 text-[10px] font-medium text-white" style={{ height: 18 }}>
          {badge}
        </span>
      ) : null}
    </span>
  )
  if (to) return <Link to={to} aria-label={label}>{inner}</Link>
  return <button type="button" aria-label={label} onClick={onClick}>{inner}</button>
}
