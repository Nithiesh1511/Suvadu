import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FAQ as FAQ_DATA } from '@/data/products'
import PageHeader from '@/components/PageHeader'
import { ChevronDown } from '@/components/Icons'
import { cn } from '@/lib/utils'

const CATEGORIES = Object.keys(FAQ_DATA)

export default function FAQ() {
  const [category, setCategory] = useState(CATEGORIES[0])
  const [open, setOpen] = useState<string | null>(`${CATEGORIES[0]}-0`)

  return (
    <div>
      <PageHeader
        eyebrow="Help centre"
        title="Frequently Asked Questions"
        subtitle="Everything about shipping, customization, returns, payments and orders — in one place."
        crumbs={[{ label: 'FAQ' }]}
      />

      <section className="container-suvadu grid gap-10 py-12 lg:grid-cols-[220px_1fr]">
        {/* Category nav */}
        <aside className="h-fit">
          <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-border bg-white p-2 shadow-card lg:flex-col">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => { setCategory(c); setOpen(`${c}-0`) }}
                className={cn(
                  'whitespace-nowrap rounded-xl px-4 py-2.5 text-left font-body text-sm transition',
                  category === c ? 'bg-royal text-white' : 'text-plum/80 hover:bg-lilac',
                )}
              >
                {c}
              </button>
            ))}
          </nav>
        </aside>

        {/* Accordion */}
        <div>
          <h2 className="mb-5 font-display text-2xl text-plum">{category}</h2>
          <div className="space-y-3">
            {FAQ_DATA[category].map((item, i) => {
              const id = `${category}-${i}`
              const isOpen = open === id
              return (
                <div key={id} className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
                  <button
                    onClick={() => setOpen(isOpen ? null : id)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="font-display text-lg text-plum">{item.q}</span>
                    <ChevronDown width={20} className={cn('shrink-0 text-royal transition-transform duration-300', isOpen && 'rotate-180')} />
                  </button>
                  <div className={cn('grid transition-all duration-300', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 font-body text-sm font-light leading-relaxed text-muted-foreground">{item.a}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-lilac/30 p-6 text-center">
            <p className="font-display text-xl text-plum">Still have a question?</p>
            <p className="mt-1 font-body text-sm font-light text-muted-foreground">Our team is happy to help.</p>
            <Link to="/contact" className="btn-primary mt-4">Contact Us</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
