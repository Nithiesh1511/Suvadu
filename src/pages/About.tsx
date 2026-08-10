import { Link } from 'react-router-dom'
import PageHeader from '@/components/PageHeader'
import NotebookCover from '@/components/NotebookCover'
import { Leaf, Pen, Sparkle, Truck, Check, ArrowRight } from '@/components/Icons'

const VALUES = [
  { Icon: Leaf, t: 'Considered materials', d: 'Premium 100 GSM paper, soft-touch covers and lay-flat binding — chosen so writing feels effortless.' },
  { Icon: Pen, t: 'Made personal', d: 'From a single name to a full custom cover, your notebook should feel unmistakably yours.' },
  { Icon: Sparkle, t: 'Quietly beautiful', d: 'Minimal, aesthetic design that earns a permanent place on your desk and in your bag.' },
  { Icon: Truck, t: 'Made in India', d: 'Designed and crafted locally, shipped pan-India with care and tracking.' },
]

export default function About() {
  return (
    <div>
      <PageHeader
        eyebrow="Our story"
        title="A notebook is where ideas begin."
        subtitle="SUVADU makes premium, minimal notebooks for the thinking mind — and helps you make every page your own."
        crumbs={[{ label: 'About Us' }]}
      />

      {/* Brand story */}
      <section className="container-suvadu grid items-center gap-12 py-16 lg:grid-cols-2">
        <div>
          <p className="eyebrow mb-3">The beginning</p>
          <h2 className="font-display text-4xl leading-tight text-plum">Brand Story</h2>
          <div className="mt-5 space-y-4 font-body text-base font-light leading-relaxed text-muted-foreground">
            <p>
              SUVADU began with a simple belief — that the things you write <em>in</em> should feel as considered as the things you write. We were tired of notebooks that looked beautiful but felt ordinary the moment you opened them.
            </p>
            <p>
              So we started over. We obsessed over paper weight until ink sat just right. We tested covers until they felt good in the hand. And we made it possible to add your name, your words, your colour — because a notebook you love is a notebook you’ll actually fill.
            </p>
            <p className="font-display text-xl italic text-royal">“Make your mark.” It isn’t just our tagline — it’s the whole point.</p>
          </div>
        </div>
        <div className="relative mx-auto grid w-full max-w-md grid-cols-2 gap-4">
          <div className="mt-8"><NotebookCover colour="#E6E6FA" pattern="plain" label="Calm Collection" /></div>
          <div><NotebookCover colour="#613092" pattern="mono" label="Inspire Ink" /></div>
          <div><NotebookCover colour="#FF8DA1" pattern="floral" label="Her Journal" /></div>
          <div className="-mt-4"><NotebookCover colour="#36454F" pattern="dots" label="Midnight" /></div>
        </div>
      </section>

      {/* Why Suvadu */}
      <section className="border-y border-border bg-lilac/30 py-16">
        <div className="container-suvadu">
          <div className="max-w-2xl">
            <p className="eyebrow mb-3">What sets us apart</p>
            <h2 className="font-display text-4xl leading-tight text-plum">Why Suvadu</h2>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {VALUES.map(({ Icon, t, d }) => (
              <div key={t} className="flex gap-4 rounded-2xl border border-border bg-white p-6 shadow-card">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-lilac text-royal"><Icon /></span>
                <div>
                  <h3 className="font-display text-xl text-plum">{t}</h3>
                  <p className="mt-1.5 font-body text-sm font-light leading-relaxed text-muted-foreground">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-suvadu pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-plum px-6 py-14 text-center text-white sm:px-12">
          <div className="pointer-events-none absolute inset-0 opacity-30 bg-grain" />
          <div className="relative mx-auto max-w-xl">
            <h2 className="font-display text-3xl text-white sm:text-4xl">Ready to make your mark?</h2>
            <p className="mt-3 font-body text-sm font-light text-white/70">Explore our collections or design a notebook that’s entirely your own.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link to="/collections" className="btn-primary bg-white text-royal hover:bg-lilac">Shop Collections <ArrowRight width={16} /></Link>
              <Link to="/special-collections" className="btn-secondary border-white/40 text-white hover:bg-white hover:text-royal">Personalise One</Link>
            </div>
            <p className="mt-6 inline-flex items-center gap-2 font-body text-xs font-light text-white/60"><Check width={14} /> Premium paper · Pan-India shipping · Secure checkout</p>
          </div>
        </div>
      </section>
    </div>
  )
}
