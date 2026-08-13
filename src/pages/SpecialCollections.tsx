import { Link } from 'react-router-dom'
import { SPECIAL_COLLECTIONS, CUSTOMIZED_PRODUCT, MATCHING_SET_PRODUCT } from '@/data/products'
import PageHeader from '@/components/PageHeader'
import NotebookCover from '@/components/NotebookCover'
import { ArrowRight, Pen, Sparkle, Check } from '@/components/Icons'

const ACCENTS: Record<string, { colour: string; pattern: 'plain' | 'wave' | 'mono' }> = {
  'match-and-write': { colour: '#FF8DA1', pattern: 'wave' },
  'made-for-you': { colour: '#E6E6FA', pattern: 'plain' },
  'create-and-carry': { colour: '#613092', pattern: 'mono' },
}

export default function SpecialCollections() {
  return (
    <div>
      <PageHeader
        eyebrow="Made to be yours"
        title="Special Collections"
        subtitle="Matching sets and fully personalised notebooks — add a name, your own words, a font and a colour."
        crumbs={[{ label: 'Special Collections' }]}
      />

      <section className="container-suvadu py-12 sm:py-16">
        <div className="grid gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
          {SPECIAL_COLLECTIONS.map((c) => {
            const a = ACCENTS[c.slug] ?? { colour: '#E6E6FA', pattern: 'plain' as const }
            return (
              <Link
                key={c.slug}
                to={`/special-collections/${c.slug}`}
                className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-card transition hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="flex aspect-[4/3] items-center justify-center" style={{ backgroundColor: a.colour + '33' }}>
                  <div className="w-36 rotate-[-4deg] transition-transform duration-500 group-hover:rotate-0 group-hover:scale-105">
                    <NotebookCover colour={a.colour} pattern={a.pattern} label={c.displayName} customText={c.slug === 'made-for-you' ? 'Your Name' : undefined} />
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5 sm:p-7">
                  <p className="eyebrow">{c.type}</p>
                  <h3 className="mt-2 font-display text-xl text-plum sm:text-2xl">{c.displayName}</h3>
                  <p className="mt-2 flex-1 font-body text-sm font-light leading-relaxed text-muted-foreground">{c.details}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 font-body text-xs font-medium uppercase tracking-cta text-royal">
                    Explore <ArrowRight width={15} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Personalisation feature band */}
      <section className="border-y border-border bg-gradient-to-b from-lilac/40 to-white py-12 sm:py-16">
        <div className="container-suvadu grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="relative mx-auto w-44 sm:w-60">
            <NotebookCover colour="#613092" pattern="plain" customText="For Ananya" customFont="Elegant Italic" className="shadow-lift" />
            <span className="absolute -right-4 -top-4 grid h-14 w-14 place-items-center rounded-full bg-white text-royal shadow-lift">
              <Pen />
            </span>
          </div>
          <div>
            <p className="eyebrow mb-3">How personalisation works</p>
            <h2 className="font-display text-3xl leading-tight text-plum sm:text-4xl">Three steps to a one-of-one notebook</h2>
            <ul className="mt-7 space-y-4">
              {[
                ['Choose your base', 'Pick a size, cover colour and pattern you love.'],
                ['Add your details', 'Type a name or short message and choose a font — preview it live.'],
                ['We craft & ship it', 'Your notebook is made to order and shipped pan-India, gift-ready.'],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-royal font-body text-sm font-medium text-white">{i + 1}</span>
                  <div>
                    <h3 className="font-display text-lg text-plum">{t}</h3>
                    <p className="font-body text-sm font-light text-muted-foreground">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={`/products/${CUSTOMIZED_PRODUCT.slug}`} className="btn-primary">
                <Sparkle width={16} /> Personalise a Notebook
              </Link>
              <Link to={`/products/${MATCHING_SET_PRODUCT.slug}`} className="btn-secondary">Shop Matching Sets</Link>
            </div>
            <p className="mt-5 flex items-center gap-2 font-body text-xs font-light text-muted-foreground">
              <Check width={15} className="text-royal" /> Custom sizes available — price on request.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
