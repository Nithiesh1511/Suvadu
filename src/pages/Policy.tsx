import PageHeader from '@/components/PageHeader'

type Kind = 'privacy' | 'terms' | 'shipping' | 'refund'

interface Section { h: string; p: string[] }
interface PolicyDoc { title: string; eyebrow: string; intro: string; sections: Section[] }

const POLICIES: Record<Kind, PolicyDoc> = {
  privacy: {
    title: 'Privacy Policy',
    eyebrow: 'Your data, respected',
    intro: 'This policy explains what information SUVADU Notebooks collects, how we use it, and the choices you have. We collect only what we need to fulfil your orders and improve your experience.',
    sections: [
      { h: 'Information we collect', p: ['Contact and delivery details you provide at checkout (name, email, mobile, address).', 'Order and customization details, including any text or names added to personalised products.', 'Usage data such as pages viewed and products browsed, used to improve the store.'] },
      { h: 'How we use your information', p: ['To process, ship and support your orders.', 'To send order updates and, with your consent, marketing emails you can unsubscribe from at any time.', 'To analyse site performance via Google Analytics 4 in an aggregated form.'] },
      { h: 'Payments', p: ['Payments are processed securely by Razorpay. We never see or store your full card details — these are handled directly by our PCI-DSS compliant payment partner.'] },
      { h: 'Your rights', p: ['You may request access to, correction of, or deletion of your personal data by contacting us. You can manage your saved details anytime from My Account.'] },
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    eyebrow: 'The essentials',
    intro: 'By using this website and placing an order, you agree to the following terms. Please read them carefully.',
    sections: [
      { h: 'Orders & pricing', p: ['All prices are shown in Indian Rupees and are inclusive of applicable taxes unless stated otherwise.', 'Prices vary by selected size. Custom-size pricing for personalised products is provided on request.', 'We reserve the right to correct pricing errors and to refuse or cancel any order.'] },
      { h: 'Personalised products', p: ['Customized notebooks are made to order based on the details you provide. Please review your name, text, font and colour carefully before placing the order.', 'Personalised items cannot be cancelled once production has begun.'] },
      { h: 'Intellectual property', p: ['All site content, designs and the SUVADU name and logo are the property of SUVADU Notebooks and may not be reproduced without permission.'] },
      { h: 'Limitation of liability', p: ['SUVADU is not liable for indirect or consequential losses arising from the use of our products or website, to the extent permitted by law.'] },
    ],
  },
  shipping: {
    title: 'Shipping Policy',
    eyebrow: 'Getting it to you',
    intro: 'We ship pan-India through trusted courier partners via Shiprocket. Here’s what to expect.',
    sections: [
      { h: 'Processing time', p: ['Ready-to-ship products are dispatched within 1–2 business days.', 'Personalised and made-to-order items take 3–5 business days to craft before dispatch.'] },
      { h: 'Delivery time', p: ['Metro cities: typically 2–4 business days after dispatch.', 'Other locations: typically 4–7 business days after dispatch.'] },
      { h: 'Charges & tracking', p: ['Shipping is calculated at checkout based on your pincode. Orders above ₹999 ship free.', 'Once dispatched, you’ll receive a tracking link by SMS and email, also available under My Account → Order History.'] },
      { h: 'Delays', p: ['Occasionally, delivery may be affected by weather, festivals or courier disruptions. We’ll keep you informed if your order is impacted.'] },
    ],
  },
  refund: {
    title: 'Return & Refund Policy',
    eyebrow: 'Peace of mind',
    intro: 'We want you to love your notebook. If something isn’t right, here’s how returns and refunds work.',
    sections: [
      { h: 'Return window', p: ['Non-personalised products can be returned within 7 days of delivery, provided they are unused and in original packaging.'] },
      { h: 'Personalised items', p: ['Because they are made to order, personalised notebooks cannot be returned unless they arrive damaged or defective.'] },
      { h: 'Damaged or wrong items', p: ['If your order arrives damaged or incorrect, contact us within 48 hours of delivery with photos and we’ll arrange a replacement or refund.'] },
      { h: 'Refunds', p: ['Approved refunds are credited to your original payment method within 5–7 business days of us receiving the returned item.'] },
    ],
  },
}

const CRUMBS: Record<Kind, string> = {
  privacy: 'Privacy Policy', terms: 'Terms & Conditions', shipping: 'Shipping Policy', refund: 'Return & Refund Policy',
}

export default function Policy({ kind }: { kind: Kind }) {
  const doc = POLICIES[kind]
  return (
    <div>
      <PageHeader eyebrow={doc.eyebrow} title={doc.title} crumbs={[{ label: CRUMBS[kind] }]} />
      <section className="container-suvadu py-12">
        <div className="mx-auto max-w-3xl">
          <p className="font-body text-base font-light leading-relaxed text-muted-foreground">{doc.intro}</p>
          <p className="mt-4 font-body text-xs font-light text-muted-foreground">Last updated: June 2026</p>

          <div className="mt-10 space-y-10">
            {doc.sections.map((s, i) => (
              <div key={s.h}>
                <h2 className="flex items-baseline gap-3 font-display text-2xl text-plum">
                  <span className="font-body text-sm font-medium text-royal">{String(i + 1).padStart(2, '0')}</span>
                  {s.h}
                </h2>
                <div className="mt-3 space-y-3 border-l-2 border-lilac pl-5">
                  {s.p.map((para, j) => (
                    <p key={j} className="font-body text-sm font-light leading-relaxed text-muted-foreground">{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
