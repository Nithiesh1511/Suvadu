import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from './Toast'
import { Instagram, Facebook, Pinterest, ArrowRight } from './Icons'

const SHOP_LINKS = [
  { label: 'Shop', to: '/collections' },
  { label: 'Special Collections', to: '/special-collections' },
  { label: 'Accessories', to: '/accessories' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
  { label: 'FAQ', to: '/faq' },
]

const LEGAL_LINKS = [
  { label: 'Terms & Conditions', to: '/terms' },
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Refund Policy', to: '/refund-policy' },
  { label: 'Shipping Policy', to: '/shipping-policy' },
]

const SOCIAL = [
  { label: 'Instagram', href: 'https://instagram.com', Icon: Instagram },
  { label: 'Facebook', href: 'https://facebook.com', Icon: Facebook },
  { label: 'Pinterest', href: 'https://pinterest.com', Icon: Pinterest },
]

export default function Footer() {
  const { notify } = useToast()
  const [email, setEmail] = useState('')

  function subscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    notify('Thanks for subscribing — check your inbox!')
    setEmail('')
  }

  return (
    <footer className="mt-24 border-t border-border bg-gradient-to-b from-lilac/40 to-white">
      <div className="container-suvadu py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
          {/* Brand */}
          <div>
            <Link to="/" className="font-display text-3xl text-plum">SUVADU</Link>
            <p className="mt-4 font-display text-xl italic text-royal">Make your mark.</p>
            <p className="mt-3 max-w-xs font-body text-sm font-light leading-relaxed text-muted-foreground">
              Premium notebooks for the thinking mind.
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

          {/* Newsletter */}
          <div>
            <h4 className="font-body text-xs font-medium uppercase tracking-[0.2em] text-plum">Stay in the loop</h4>
            <p className="mt-5 font-body text-sm font-light leading-relaxed text-muted-foreground">
              New collections, restocks and the occasional poem. No spam.
            </p>
            <form onSubmit={subscribe} className="mt-4 flex overflow-hidden rounded-full border border-border bg-white p-1 focus-within:border-royal">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="w-full bg-transparent px-4 font-body text-sm text-plum outline-none placeholder:text-muted-foreground/60"
              />
              <button type="submit" aria-label="Subscribe" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-royal text-white transition hover:bg-royal-700">
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
