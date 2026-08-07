// Renders a JSON-LD structured-data block (brief §11 — Schema markup).
// Crawlers read it straight from the DOM; React renders it inertly.
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
