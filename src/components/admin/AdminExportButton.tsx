'use client'

import { useState } from 'react'

/**
 * Export CSV des commandes pour la déclaration URSSAF trimestrielle.
 *
 * Les trimestres sont proposés directement : c'est le découpage réel d'une
 * déclaration de micro-entreprise, et saisir deux dates à la main pour ça à chaque
 * fois est une corvée inutile.
 */

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Les 4 derniers trimestres civils, du plus récent au plus ancien. */
function recentQuarters(now = new Date()): { label: string; from: string; to: string }[] {
  const out: { label: string; from: string; to: string }[] = []
  let year = now.getUTCFullYear()
  let quarter = Math.floor(now.getUTCMonth() / 3)

  for (let i = 0; i < 4; i++) {
    const startMonth = quarter * 3
    const from = new Date(Date.UTC(year, startMonth, 1))
    const to   = new Date(Date.UTC(year, startMonth + 3, 0)) // jour 0 = dernier jour du mois précédent
    out.push({ label: `T${quarter + 1} ${year}`, from: isoDay(from), to: isoDay(to) })
    quarter -= 1
    if (quarter < 0) { quarter = 3; year -= 1 }
  }
  return out
}

export default function AdminExportButton() {
  const [open, setOpen]   = useState(false)
  const [from, setFrom]   = useState('')
  const [to, setTo]       = useState('')
  const quarters = recentQuarters()

  function download(range?: { from: string; to: string }) {
    const params = new URLSearchParams()
    const f = range?.from ?? from
    const t = range?.to ?? to
    if (f) params.set('from', f)
    if (t) params.set('to', t)
    // Navigation directe : la route répond en Content-Disposition: attachment,
    // le navigateur télécharge sans quitter la page.
    window.location.href = `/api/admin/export${params.toString() ? `?${params}` : ''}`
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-pill border border-[var(--line-2)] px-3 py-2 text-xs font-medium text-ink-2 transition-colors hover:border-[var(--line-amber)] hover:text-ink-1 sm:px-4"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2v8M8 10L5 7M8 10l3-3M2.5 13h11" />
        </svg>
        <span className="hidden sm:inline">Export CSV</span>
      </button>

      {open && (
        <>
          {/* Clic extérieur — pas de listener global à nettoyer */}
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-30 mt-2 w-72 space-y-3 rounded-xl border border-[var(--line)] bg-bg-1 p-3 shadow-pop">
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">Trimestre</p>
              <div className="grid grid-cols-2 gap-1.5">
                {quarters.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => download(q)}
                    className="cursor-pointer rounded-lg border border-[var(--line-2)] px-2 py-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:border-[var(--line-amber)] hover:text-ink-0"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-[var(--line)] pt-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">Période libre</p>
              <div className="flex items-center gap-1.5">
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Du"
                  className="min-w-0 flex-1 cursor-pointer rounded-lg border border-[var(--line-2)] bg-bg-2 px-2 py-1.5 text-[12px] text-ink-1 focus:border-amber/50 focus:outline-none" />
                <span className="text-[11px] text-ink-3">→</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Au"
                  className="min-w-0 flex-1 cursor-pointer rounded-lg border border-[var(--line-2)] bg-bg-2 px-2 py-1.5 text-[12px] text-ink-1 focus:border-amber/50 focus:outline-none" />
              </div>
            </div>

            <button
              onClick={() => download()}
              className="w-full cursor-pointer rounded-lg bg-amber px-3 py-2 text-[12px] font-bold text-bg-0 transition-opacity hover:opacity-90"
            >
              {from || to ? 'Télécharger la période' : 'Télécharger tout l’historique'}
            </button>

            <p className="text-[10px] leading-snug text-ink-3">
              Les 3 flux dans un seul fichier. Le sur-mesure est compté à l’acompte encaissé.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
