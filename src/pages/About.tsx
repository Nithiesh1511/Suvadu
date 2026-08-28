import { Link } from 'react-router-dom'
import PageHeader from '@/components/PageHeader'
import NotebookCover from '@/components/NotebookCover'
import { Leaf, Pen, Sparkle, Truck, Check, ArrowRight } from '@/components/Icons'
import { useCatalog } from '@/context/CatalogContext'
import { cn } from '@/lib/utils'

/** Four covers beside the brand story. These used to be labelled "Inspire Ink",
 *  "Her Journal" and "Midnight" — names that exist nowhere else in the shop, so
 *  anyone who went looking for them found nothing. Show real collections, and
 *  make them links, since that's what a reader will try to do with them. */
function StoryCovers() {
  const { collections } = useCatalog()
  const shown = collections.slice(0, 4)
  const offsets = ['mt-8', '', '', '-mt-4']

  // Before the catalogue lands, hold the layout with unlabelled covers rather
  // than inventing collection names.
  if (shown.length === 0) {
    return (
      <div aria-hidden className="relative mx-auto grid w-full max-w-md grid-cols-2 gap-4">
        {PLACEHOLDER_COVERS.map((c, i) => (
          <div key={i} className={offsets[i]}><NotebookCover colour={c.colour} pattern={c.pattern} /></div>
        ))}
      </div>
    )
  }

  return (
    <div className="relative mx-auto grid w-full max-w-md grid-cols-2 gap-4">
      {shown.map((col, i) => (
        <Link
          key={col.slug}
          to={`/collections/${col.slug}`}
          className={cn('transition duration-300 hover:-translate-y-1', offsets[i])}
        >
          <NotebookCover colour={col.accent} pattern={col.pattern} label={col.displayName} />
        </Link>
      ))}
    </div>
  )
}

const PLACEHOLDER_COVERS = [
  { colour: '#E6E6FA', pattern: 'plain' as const },
  { colour: '#613092', pattern: 'mono' as const },
  { colour: '#FF8DA1', pattern: 'floral' as const },
  { colour: '#36454F', pattern: 'dots' as const },
]

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
          <h2 className="font-display text-3xl leading-tight text-plum sm:text-4xl">Brand Story</h2>
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
        <StoryCovers />
      </section>

      {/* Why Suvadu */}
      <section className="border-y border-border bg-lilac/30 py-16">
        <div className="container-suvadu">
          <div className="max-w-2xl">
            <p className="eyebrow mb-3">What sets us apart</p>
            <h2 className="font-display text-3xl leading-tight text-plum sm:text-4xl">Why Suvadu</h2>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {VALUES.map(({ Icon, t, d }) => (
              <div key={t} className="flex gap-4 rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-lilac text-royal"><Icon /></span>
                <div className="min-w-0">
                  <h3 className="font-display text-lg text-plum sm:text-xl">{t}</h3>
                  <p className="mt-1.5 font-body text-sm font-light leading-relaxed text-muted-foreground">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-suvadu pb-20">
        <div className="relative overflow-hidden rounded-2xl bg-plum px-5 py-12 text-center text-white sm:rounded-3xl sm:px-12 sm:py-14">
          <div className="pointer-events-none absolute inset-0 opacity-30 bg-grain" />
          <div className="relative mx-auto max-w-xl">
            <h2 className="font-display text-2xl text-white sm:text-4xl">Ready to make your mark?</h2>
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
