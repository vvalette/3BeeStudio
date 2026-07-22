'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

// Upload du modèle 3D (.stl / .3mf) du produit.
// Extrait d'AdminBoutiqueProductForm.tsx — aucun changement de comportement.

export default function StlUpload({ stlUrl, onChange }: { stlUrl: string | null; onChange: (url: string | null) => void }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0]
    if (!file) return
    setError(null)
    setUploading(true)

    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/admin/upload/stl', { method: 'POST', body: form })
    const data = await res.json()

    if (!res.ok) setError(data.error ?? 'Erreur upload')
    else onChange(data.url)

    setUploading(false)
  }, [onChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'model/stl':                    ['.stl'],
      'model/3mf':                    ['.3mf'],
      'application/octet-stream':     ['.stl', '.3mf'],
      'application/vnd.ms-pki.stl':   ['.stl'],
      'application/vnd.ms-3mfdocument': ['.3mf'],
    },
    maxFiles: 1,
    disabled: uploading,
  })

  if (stlUrl) {
    const filename = decodeURIComponent(stlUrl.split('/').pop() ?? stlUrl).replace(/^\d+-[a-z0-9]+\./, '')
    const fileExt  = filename.split('.').pop()?.toUpperCase() ?? 'STL'
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-bg-1 px-4 py-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber shrink-0">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /><path d="M12 18v-6M9 15l3 3 3-3" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink-0">{filename}</p>
          <p className="text-[11px] text-ink-3">Modèle {fileExt} chargé</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="cursor-pointer rounded-lg p-1.5 text-ink-3 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 5h10M5 5V3.5h6V5M6 8v5M10 8v5M4 5l1 8h6l1-8" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        )}
        <div>
          <p className="text-sm font-medium">{uploading ? 'Upload en cours…' : 'Glisser ou cliquer pour ajouter un modèle 3D'}</p>
          <p className="text-[11px]">Format .stl ou .3mf · max 50 Mo</p>
        </div>
      </div>
      {error && <p className="text-[12px] text-red-400">{error}</p>}
    </div>
  )
}
