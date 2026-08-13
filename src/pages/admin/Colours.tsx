import { useEffect, useState } from 'react'
import { supabase, type ColourRow } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { useSeo } from '@/lib/seo'
import { Plus, Trash } from '@/components/Icons'
import { AdminCard, AdminField, AdminInput, StatusBadge } from './ui'

export default function AdminColours() {
  useSeo('Admin — Colours', 'Manage SUVADU cover colours.')
  const { notify } = useToast()
  const [colours, setColours] = useState<ColourRow[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', hex: '#E6E6FA' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    supabase.from('colours').select('*').order('sort_order', { ascending: true }).then(({ data }) => {
      if (!active) return
      setColours((data as ColourRow[]) ?? [])
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) { notify('Enter a colour name.'); return }
    if (!/^#[0-9a-fA-F]{6}$/.test(form.hex)) { notify('Enter a valid hex colour, e.g. #E6E6FA.'); return }
    setSaving(true)
    const { data, error } = await supabase
      .from('colours')
      .insert({ name, hex: form.hex, sort_order: colours.length })
      .select()
      .single()
    setSaving(false)
    if (error) { notify(error.message.includes('duplicate') ? 'That colour name already exists.' : error.message); return }
    setColours((prev) => [...prev, data as ColourRow])
    setForm({ name: '', hex: '#E6E6FA' })
    notify(`Added ${name}.`)
  }

  async function toggle(c: ColourRow) {
    const { error } = await supabase.from('colours').update({ active: !c.active }).eq('name', c.name)
    if (error) { notify(error.message); return }
    setColours((prev) => prev.map((x) => (x.name === c.name ? { ...x, active: !x.active } : x)))
  }

  async function updateHex(name: string, hex: string) {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return
    const { error } = await supabase.from('colours').update({ hex }).eq('name', name)
    if (error) { notify(error.message); return }
    setColours((prev) => prev.map((x) => (x.name === name ? { ...x, hex } : x)))
  }

  async function remove(name: string) {
    const { error } = await supabase.from('colours').delete().eq('name', name)
    if (error) { notify(error.message); return }
    setColours((prev) => prev.filter((x) => x.name !== name))
    notify(`Removed ${name}.`)
  }

  return (
    <div className="space-y-6">
      <AdminCard title="Add colour">
        <form onSubmit={create} className="flex flex-wrap items-end gap-4">
          <AdminInput label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Ivory White" className="min-w-[200px]" />
          <AdminField label="Hex">
            <div className="flex items-center gap-2">
              <input type="color" value={form.hex} onChange={(e) => setForm((f) => ({ ...f, hex: e.target.value }))} className="h-10 w-12 cursor-pointer rounded border border-border bg-white" />
              <input className="field w-28" value={form.hex} onChange={(e) => setForm((f) => ({ ...f, hex: e.target.value }))} />
            </div>
          </AdminField>
          <button type="submit" disabled={saving} className="btn-primary btn-sm"><Plus width={15} /> {saving ? 'Saving…' : 'Add'}</button>
        </form>
      </AdminCard>

      <AdminCard title={`Colours (${colours.length})`}>
        {loading ? (
          <p className="font-body text-sm font-light text-muted-foreground">Loading…</p>
        ) : colours.length === 0 ? (
          <p className="font-body text-sm font-light text-muted-foreground">No colours yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {colours.map((c) => (
              <div key={c.name} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-border p-3">
                <input type="color" value={c.hex} onChange={(e) => updateHex(c.name, e.target.value)} aria-label={`${c.name} colour`} className="h-9 w-9 shrink-0 cursor-pointer rounded-full border border-border bg-white" />
                <div className="min-w-0 flex-1 basis-24">
                  <p className="truncate font-body text-sm font-medium text-plum">{c.name}</p>
                  <p className="font-body text-xs font-light text-muted-foreground">{c.hex}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={c.active ? 'active' : 'inactive'} />
                  <button onClick={() => toggle(c)} className="font-body text-xs font-medium text-royal hover:underline">{c.active ? 'Hide' : 'Show'}</button>
                  <button onClick={() => remove(c.name)} aria-label="Delete" className="text-muted-foreground hover:text-rose-500"><Trash width={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  )
}
