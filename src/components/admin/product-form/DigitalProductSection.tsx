'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { labelClass } from './state'
import type { ProductFormState } from './state'
import type { ProductType } from '@/types/shop-product'

/**
 * Choix du type de produit et upload du fichier **vendu**.
 *
 * Le fichier part vers un bucket privé et l'API ne renvoie qu'un chemin de
 * stockage, jamais une URL : contrairement au modèle 3D d'aperçu, ce fichier ne
 * doit jamais être joignable sans passer par la route de téléchargement payante.
 */

const TYPES: { value: ProductType; label: string; hint: string; icon: React.ReactNode }[] = [
  {
    value: 'physical',
    label: 'Objet physique',
    hint: 'Imprimé et expédié. Stock, poids et frais de port s’appliquent.',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 4h12l-1 8H3L2 4z" /><path d="M5 4l1-2h4l1 2" />
      </svg>
    ),
  },
  {
    value: 'digital',
    label: 'Fichier à télécharger',
    hint: 'Livré par lien après paiement. Ni stock, ni poids, ni port.',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2v8M8 10L5 7M8 10l3-3M2.5 13h11" />
      </svg>
    ),
  },
]

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`
}

export default function DigitalProductSection({
  form,
  set,
}: {
  form: ProductFormState
  set: <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/admin/upload/digital-file', { method: 'POST', body })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur upload'); return }
      set('digitalFilePath', data.path)
      set('digitalFileName', data.name)
      set('digitalFileSize', data.size)
    } catch {
      setError('Réseau indisponible — fichier non envoyé')
    } finally {
      setUploading(false)
    }
  }, [set])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    disabled: uploading,
  })

  const isDigital = form.productType === 'digital'

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Type de produit</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {TYPES.map((t) => {
            const active = form.productType === t.value
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => set('productType', t.value)}
                className={[
                  'flex cursor-pointer flex-col gap-1 rounded-xl border px-4 py-3 text-left transition-colors',
                  active ? 'border-[var(--line-amber)] bg-amber/5' : 'border-[var(--line)] hover:border-[var(--line-2)]',
                ].join(' ')}
              >
                <span className={['flex items-center gap-2 text-sm font-semibold', active ? 'text-amber' : 'text-ink-1'].join(' ')}>
                  {t.icon}
                  {t.label}
                </span>
                <span className="text-[11px] leading-snug text-ink-3">{t.hint}</span>
              </button>
            )
          })}
        </div>
      </div>

      {isDigital && (
        <>
          <div
            className="rounded-xl border px-4 py-3"
            style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            <p className="text-[12px] font-semibold text-amber">Le modèle 3D d’aperçu reste public</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-2">
              Le fichier chargé plus haut pour le viewer 3D est téléchargeable par n’importe qui
              (le navigateur doit le charger pour l’afficher). Mettez-y une version <strong>décimée</strong> ou
              partielle — jamais le fichier que vous vendez ci-dessous.
            </p>
          </div>

          <div>
            <label className={labelClass}>Fichier vendu — bucket privé</label>

            {form.digitalFilePath ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-emerald-400">
                  <rect x="3" y="7" width="10" height="6.5" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-0">{form.digitalFileName ?? 'Fichier chargé'}</p>
                  <p className="text-[11px] text-ink-3">
                    {form.digitalFileSize ? `${formatSize(form.digitalFileSize)} · ` : ''}
                    stocké en privé, servi par lien signé après paiement
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { set('digitalFilePath', null); set('digitalFileName', null); set('digitalFileSize', null) }}
                  aria-label="Retirer le fichier"
                  className="cursor-pointer rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 5h10M5 5V3.5h6V5M6 8v5M10 8v5M4 5l1 8h6l1-8" />
                  </svg>
                </button>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={[
                  'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all',
                  isDragActive ? 'border-amber bg-amber/5 text-amber' : 'border-[var(--line)] text-ink-3 hover:border-amber/50 hover:text-ink-2',
                  uploading ? 'pointer-events-none opacity-40' : '',
                ].join(' ')}
              >
                <input {...getInputProps()} />
                {uploading ? (
                  <svg className="animate-spin text-amber" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" /></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="7" width="10" height="6.5" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
                  </svg>
                )}
                <div>
                  <p className="text-sm font-medium">{uploading ? 'Envoi en cours…' : 'Glisser ou cliquer pour ajouter le fichier vendu'}</p>
                  <p className="text-[11px]">.stl · .3mf · .step · .obj · .zip — max 100 Mo</p>
                </div>
              </div>
            )}

            {error && <p className="mt-2 text-[12px] text-red-400">{error}</p>}

            <p className="mt-2 text-[11px] leading-snug text-ink-3">
              Astuce : un <strong className="text-ink-2">.zip</strong> permet de livrer plusieurs variantes,
              un profil d’impression et une notice en une seule fois.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
