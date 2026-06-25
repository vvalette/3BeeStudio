'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Tooltip from '@/components/ui/Tooltip'
import { useConfirm } from '@/components/ui/ConfirmModal'

interface Testimonial {
  id: string
  name: string
  role: string
  body: string
  avatar_gradient: string
  display_order: number
  visible: boolean
  created_at: string
}

const GRADIENT_PRESETS = [
  { label: 'Amber',   value: 'linear-gradient(135deg, #F59E0B, #7C2D12)' },
  { label: 'Indigo',  value: 'linear-gradient(135deg, #6366F1, #1E1B4B)' },
  { label: 'Green',   value: 'linear-gradient(135deg, #10B981, #064E3B)' },
  { label: 'Rose',    value: 'linear-gradient(135deg, #F43F5E, #4C0519)' },
  { label: 'Cyan',    value: 'linear-gradient(135deg, #06B6D4, #164E63)' },
]

const EMPTY_FORM = { name: '', role: '', body: '', avatar_gradient: GRADIENT_PRESETS[0].value, display_order: 0 }

type EditForm = { name: string; role: string; body: string; avatar_gradient: string; display_order: number }

export default function AdminTestimonialsList({ initialItems }: { initialItems: Testimonial[] }) {
  const router = useRouter()
  const { confirm, modal } = useConfirm()
  const [items, setItems] = useState<Testimonial[]>(initialItems)
  const [form, setForm] = useState(EMPTY_FORM)
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_FORM)

  function openEdit(item: Testimonial) {
    setEditingId(item.id)
    setEditForm({ name: item.name, role: item.role, body: item.body, avatar_gradient: item.avatar_gradient, display_order: item.display_order })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function toggleVisible(item: Testimonial) {
    const res = await fetch(`/api/admin/testimonials/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible: !item.visible }),
    })
    if (!res.ok) return
    setItems((prev) => prev.map((t) => t.id === item.id ? { ...t, visible: !t.visible } : t))
  }

  async function deleteItem(id: string) {
    if (!await confirm({ title: 'Supprimer ce témoignage ?', confirmLabel: 'Supprimer', variant: 'danger' })) return
    const res = await fetch(`/api/admin/testimonials/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    setItems((prev) => prev.filter((t) => t.id !== id))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/admin/testimonials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const created = await res.json()
      setItems((prev) => [...prev, created].sort((a, b) => a.display_order - b.display_order))
      setForm(EMPTY_FORM)
      setAdding(false)
      router.refresh()
    }
    setLoading(false)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return
    setLoading(true)
    const res = await fetch(`/api/admin/testimonials/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (res.ok) {
      const updated = await res.json()
      setItems((prev) => prev.map((t) => t.id === editingId ? updated : t).sort((a, b) => a.display_order - b.display_order))
      setEditingId(null)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-[calc(100dvh-72px)] py-8 px-5 sm:px-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ink-0">Témoignages</h1>
          <p className="text-ink-2 text-sm mt-1">{items.length} témoignage{items.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setAdding((v) => !v); setEditingId(null) }}
          className="px-4 py-2 rounded-md bg-amber text-bg-0 text-sm font-semibold hover:bg-amber-soft transition-colors cursor-pointer"
        >
          {adding ? 'Annuler' : '+ Ajouter'}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <form onSubmit={handleAdd} className="mb-8 border border-[var(--line-amber)] bg-bg-2 rounded-xl p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-ink-0 mb-1">Nouveau témoignage</h2>
          <FormFields form={form} setForm={setForm} />
          <button
            type="submit"
            disabled={loading}
            className="self-end px-5 py-2 rounded-md bg-amber text-bg-0 text-sm font-semibold hover:bg-amber-soft transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      )}

      {/* List */}
      <div className="flex flex-col gap-3">
        {items.length === 0 && (
          <p className="text-ink-2 text-sm text-center py-12">Aucun témoignage pour l'instant.</p>
        )}
        {items.map((item) => (
          <div key={item.id} className="border border-[var(--line)] bg-bg-2 rounded-xl overflow-hidden" style={{ opacity: item.visible ? 1 : 0.45 }}>
            {/* Row */}
            <div className="p-5 flex gap-4 items-start">
              <div
                className="w-10 h-10 rounded-full flex-shrink-0 border border-[var(--line)] mt-0.5"
                style={{ background: item.avatar_gradient }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-sm text-ink-0">{item.name}</span>
                  <span className="font-mono text-ink-3 text-[10px] tracking-wide">#{item.display_order}</span>
                  {!item.visible && (
                    <span className="font-mono text-[9px] tracking-widest uppercase bg-bg-3 text-ink-2 px-1.5 py-0.5 rounded">masqué</span>
                  )}
                </div>
                <div className="font-mono text-ink-3 text-[10px] mb-2">{item.role}</div>
                <p className="text-ink-1 text-sm leading-relaxed">&ldquo;{item.body}&rdquo;</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Tooltip content="Modifier">
                  <button
                    onClick={() => editingId === item.id ? cancelEdit() : openEdit(item)}
                    className={`w-8 h-8 rounded-md border bg-bg-3 transition-all flex items-center justify-center cursor-pointer ${editingId === item.id ? 'border-[var(--line-amber)] text-amber' : 'border-[var(--line)] text-ink-2 hover:text-amber hover:border-[var(--line-amber)]'}`}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </Tooltip>
                <Tooltip content={item.visible ? 'Masquer' : 'Afficher'}>
                  <button
                    onClick={() => toggleVisible(item)}
                    className="w-8 h-8 rounded-md border border-[var(--line)] bg-bg-3 text-ink-2 hover:text-amber hover:border-[var(--line-amber)] transition-all flex items-center justify-center cursor-pointer"
                  >
                    {item.visible ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    )}
                  </button>
                </Tooltip>
                <Tooltip content="Supprimer">
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="w-8 h-8 rounded-md border border-[var(--line)] bg-bg-3 text-ink-2 hover:text-red-400 hover:border-red-400/40 transition-all flex items-center justify-center cursor-pointer"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Inline edit form */}
            {editingId === item.id && (
              <form onSubmit={handleEdit} className="border-t border-[var(--line-amber)] bg-bg-1 px-5 pb-5 pt-4 flex flex-col gap-4">
                <h3 className="font-semibold text-sm text-amber">Modifier le témoignage</h3>
                <FormFields form={editForm} setForm={setEditForm} />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-4 py-2 rounded-md border border-[var(--line)] text-ink-2 text-sm hover:text-ink-0 transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 rounded-md bg-amber text-bg-0 text-sm font-semibold hover:bg-amber-soft transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        ))}
      </div>
      {modal}
    </div>
  )
}

function FormFields({
  form,
  setForm,
}: {
  form: EditForm
  setForm: React.Dispatch<React.SetStateAction<EditForm>>
}) {
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="font-mono text-ink-3 text-[10px] tracking-widest uppercase">Nom</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="bg-bg-3 border border-[var(--line)] rounded-md px-3 py-2 text-sm text-ink-0 focus:outline-none focus:border-[var(--line-amber)]"
            placeholder="Léa M."
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-ink-3 text-[10px] tracking-widest uppercase">Rôle / Source</label>
          <input
            required
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            className="bg-bg-3 border border-[var(--line)] rounded-md px-3 py-2 text-sm text-ink-0 focus:outline-none focus:border-[var(--line-amber)]"
            placeholder="@lea.designs · TikTok"
            autoComplete="off"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="font-mono text-ink-3 text-[10px] tracking-widest uppercase">Témoignage</label>
        <textarea
          required
          rows={3}
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          className="bg-bg-3 border border-[var(--line)] rounded-md px-3 py-2 text-sm text-ink-0 focus:outline-none focus:border-[var(--line-amber)] resize-none"
          placeholder="La finition est dingue…"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="font-mono text-ink-3 text-[10px] tracking-widest uppercase">Couleur avatar</label>
          <div className="flex gap-2">
            {GRADIENT_PRESETS.map((g) => (
              <button
                key={g.value}
                type="button"
                title={g.label}
                onClick={() => setForm((f) => ({ ...f, avatar_gradient: g.value }))}
                className="w-7 h-7 rounded-full border-2 transition-all cursor-pointer"
                style={{
                  background: g.value,
                  borderColor: form.avatar_gradient === g.value ? '#F59E0B' : 'transparent',
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-ink-3 text-[10px] tracking-widest uppercase">Ordre d'affichage</label>
          <input
            type="number"
            value={form.display_order}
            onChange={(e) => setForm((f) => ({ ...f, display_order: Number(e.target.value) }))}
            className="bg-bg-3 border border-[var(--line)] rounded-md px-3 py-2 text-sm text-ink-0 focus:outline-none focus:border-[var(--line-amber)] w-24"
          />
        </div>
      </div>
    </>
  )
}
