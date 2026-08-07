import { useState } from 'react'
import PageHeader from '@/components/PageHeader'
import { useToast } from '@/components/Toast'
import { Whatsapp, Mail, Instagram, Facebook, Pinterest, ArrowRight } from '@/components/Icons'

const PHONE = '919876543210' // demo WhatsApp number
const EMAIL = 'hello@suvadu.example.com'

const CHANNELS = [
  { Icon: Whatsapp, label: 'WhatsApp', value: 'Chat with us', href: `https://wa.me/${PHONE}`, external: true },
  { Icon: Mail, label: 'Email', value: EMAIL, href: `mailto:${EMAIL}`, external: false },
  { Icon: Instagram, label: 'Instagram', value: '@suvadu.notebooks', href: 'https://instagram.com', external: true },
  { Icon: Facebook, label: 'Facebook', value: 'SUVADU Notebooks', href: 'https://facebook.com', external: true },
  { Icon: Pinterest, label: 'Pinterest', value: 'SUVADU', href: 'https://pinterest.com', external: true },
]

export default function Contact() {
  const { notify } = useToast()
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [sent, setSent] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) { notify('Please fill in your name, email and message.'); return }
    // In production this posts to the admin "Contact Requests" module.
    setSent(true)
    notify('Message sent — we’ll be in touch soon!')
    setForm({ name: '', email: '', phone: '', message: '' })
  }

  return (
    <div>
      <PageHeader
        eyebrow="We’d love to hear from you"
        title="Contact Us"
        subtitle="Questions about an order, a custom design or just want to say hello? Reach us however suits you best."
        crumbs={[{ label: 'Contact' }]}
      />

      <section className="container-suvadu grid gap-10 py-12 lg:grid-cols-[1fr_1.2fr]">
        {/* Channels */}
        <div>
          <h2 className="font-display text-2xl text-plum">Reach us directly</h2>
          <div className="mt-6 space-y-3">
            {CHANNELS.map(({ Icon, label, value, href, external }) => (
              <a
                key={label}
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-lilac text-royal transition group-hover:bg-royal group-hover:text-white"><Icon /></span>
                <span className="flex-1">
                  <span className="block font-body text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
                  <span className="block font-body text-sm font-medium text-plum">{value}</span>
                </span>
                <ArrowRight width={16} className="text-muted-foreground transition group-hover:translate-x-1 group-hover:text-royal" />
              </a>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-lilac/30 p-5">
            <p className="font-body text-sm font-medium text-plum">Customer care hours</p>
            <p className="mt-1 font-body text-sm font-light text-muted-foreground">Mon–Sat · 10:00 AM – 7:00 PM IST</p>
            <p className="mt-1 font-body text-sm font-light text-muted-foreground">Pan-India · Crafted &amp; shipped from India</p>
          </div>
        </div>

        {/* Form */}
        <div className="card-surface p-6 sm:p-8">
          <h2 className="font-display text-2xl text-plum">Send a message</h2>
          <p className="mt-1 font-body text-sm font-light text-muted-foreground">We typically reply within one business day.</p>
          <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
            <Field label="Email" type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
            <Field label="Phone Number" type="tel" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} className="sm:col-span-2" />
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block font-body text-xs font-medium uppercase tracking-wide text-plum">Message</span>
              <textarea
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                rows={5}
                placeholder="How can we help?"
                className="field resize-none"
              />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary btn-lg w-full sm:w-auto">Submit</button>
              {sent && <p className="mt-3 font-body text-sm font-light text-royal">Thanks — your message is on its way. ✦</p>}
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', className }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; className?: string
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="mb-1.5 block font-body text-xs font-medium uppercase tracking-wide text-plum">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="field" />
    </label>
  )
}
