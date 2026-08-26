import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from './Toast'
import { supabase } from '@/lib/supabase'
import { isEmail } from '@/lib/utils'
import { Instagram, Facebook, Pinterest, ArrowRight } from './Icons'
import Logo from './Logo'

const SHOP_LINKS = [
  { label: 'Shop', to: '/collections' },
  { label: 'Special Collections', to: '/special-collections' },
  { label: 'Accessories', to: '/accessories' },
  { label: 'About', to: '/about' },
  { label: 'FAQ', to: '/faq' },
]

const LEGAL_LINKS = [
  { label: 'Terms & Conditions', to: '/terms' },
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Refund Policy', to: '/refund-policy' },
  { label: 'Shipping Policy', to: '/shipping-policy' },
]

const SOCIAL = [
  { label: 'Instagram', href: 'https://www.instagram.com/suvadu.notebooks/', Icon: Instagram },
  { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61587945124861', Icon: Facebook },
  { label: 'Pinterest', href: 'https://in.pinterest.com/Suvadunotebooks/', Icon: Pinterest },
]

export default function Footer() {
  const { notify } = useToast()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  async function subscribe(e: React.FormEvent) {
    e.preventDefault()
    const value = email.trim().toLowerCase()
    if (!isEmail(value)) { notify('Please enter a valid email address.'); return }
    setBusy(true)
    // upsert so a repeat sign-up doesn't error on the primary-key conflict.
    const { error } = await supabase.from('newsletter_subscribers').upsert({ email: value }, { onConflict: 'email' })
    setBusy(false)
    if (error) { notify('Could not subscribe right now — please try again.'); return }
    notify('Thanks for subscribing!')
    setEmail('')
  }

  return (
    <footer className="mt-16 border-t border-border bg-gradient-to-b from-lilac/40 to-white sm:mt-24">
      <div className="container-suvadu py-12 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 sm:gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
          {/* Brand */}
          <div>
            <Link to="/" aria-label="Suvadu — home" className="inline-block">
              <Logo className="h-14 sm:h-16" />
            </Link>
            <p className="mt-4 font-display text-xl italic text-royal">Make your mark.</p>
            <p className="mt-3 max-w-xs font-body text-sm font-light leading-relaxed text-muted-foreground">
              Suvadu notebooks for the thinking mind.
            </p>
            <div className="mt-6 flex gap-3">
              {SOCIAL.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid h-10 w-10 place-items-center rounded-full border border-royal/20 text-royal transition hover:bg-royal hover:text-white"
                >
                  <Icon width={18} height={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <nav>
            <h4 className="font-body text-xs font-medium uppercase tracking-[0.2em] text-plum">Explore</h4>
            <ul className="mt-5 space-y-3">
              {SHOP_LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="font-body text-sm font-light text-muted-foreground transition hover:text-royal">{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Legal */}
          <nav>
            <h4 className="font-body text-xs font-medium uppercase tracking-[0.2em] text-plum">Policies</h4>
            <ul className="mt-5 space-y-3">
              {LEGAL_LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="font-body text-sm font-light text-muted-foreground transition hover:text-royal">{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Newsletter — spans both columns at sm so the field keeps its width */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h4 className="font-body text-xs font-medium uppercase tracking-[0.2em] text-plum">Stay in the loop</h4>
            <p className="mt-5 font-body text-sm font-light leading-relaxed text-muted-foreground">
              New collections, restocks and the occasional poem. No spam.
            </p>
            <form onSubmit={subscribe} className="mt-4 flex overflow-hidden rounded-full border border-border bg-white p-1 focus-within:border-royal">
              <label htmlFor="footer-newsletter" className="sr-only">Email address for newsletter</label>
              <input
                id="footer-newsletter"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="w-full min-w-0 bg-transparent px-4 font-body text-base text-plum outline-none placeholder:text-muted-foreground/60 sm:text-sm"
              />
              <button type="submit" disabled={busy} aria-label="Subscribe" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-royal text-white transition hover:bg-royal-700 disabled:opacity-50">
                <ArrowRight width={18} height={18} />
              </button>
            </form>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-center sm:flex-row sm:text-left">
          <p className="font-body text-xs font-light text-muted-foreground">
            © {new Date().getFullYear()} SUVADU Notebooks. All rights reserved. · <Link to="/admin" className="hover:text-royal">Admin</Link>
          </p>
          <p className="font-body text-xs font-light text-muted-foreground">Crafted in India · Pan-India shipping · Secure payments via Razorpay</p>
        </div>
      </div>
    </footer>
  )
}
