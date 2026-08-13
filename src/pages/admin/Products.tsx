import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCatalog } from '@/context/CatalogContext'
import { useToast } from '@/components/Toast'
import ProductImage from '@/components/ProductImage'
import { useSeo } from '@/lib/seo'
import { formatINR } from '@/lib/utils'
import { Plus, Trash, Pen } from '@/components/Icons'
import { AdminCard } from './ui'

export default function AdminProducts() {
  useSeo('Admin — Products', 'Manage SUVADU products.')
  const { products, deleteProduct } = useCatalog()
  const { notify } = useToast()
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase()
    const list = query
      ? products.filter((p) => p.name.toLowerCase().includes(query) || p.collectionName.toLowerCase().includes(query))
      : products
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [products, q])

  async function remove(id: string, name: string) {
    const ok = await deleteProduct(id)
    notify(ok ? `Removed “${name}”` : 'Delete failed — check admin access.')
  }

  return (
    <AdminCard
      title={`Products (${products.length})`}
      action={<Link to="/admin/products/new" className="btn-primary btn-sm"><Plus width={15} /> Add product</Link>}
    >
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="field mb-4 max-w-xs" />

      {rows.length === 0 ? (
        <p className="font-body text-sm font-light text-muted-foreground">No products match “{q}”.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-scroll w-full text-left font-body text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Product</th>
                <th className="py-2 pr-4 font-medium">Collection</th>
                <th className="py-2 pr-4 font-medium">A5</th>
                <th className="py-2 pr-4 font-medium">Flags</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-border/60 last:border-0 align-middle">
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 shrink-0"><ProductImage image={p.image} alt={p.name} colour={p.colour.hex} pattern={p.pattern} /></span>
                      <span className="font-medium text-plum">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{p.collectionName}</td>
                  <td className="py-2.5 pr-4 text-plum">{formatINR(p.prices.A5)}</td>
                  <td className="py-2.5 pr-4 text-xs text-royal">
                    {p.bestseller && <span className="mr-1">Bestseller</span>}
                    {p.isNew && <span>New</span>}
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="inline-flex items-center gap-3">
                      <Link to={`/admin/products/${p.id}/edit`} className="inline-flex items-center gap-1 font-medium text-royal hover:underline"><Pen width={13} /> Edit</Link>
                      <button onClick={() => remove(p.id, p.name)} className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-rose-500"><Trash width={13} /> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminCard>
  )
}
