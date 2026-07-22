'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import ImageCropModal from '../ImageCropModal'
import Tooltip from '@/components/ui/Tooltip'

// Upload des images produit (max 6) avec crop systématique avant envoi.
// Extrait d'AdminBoutiqueProductForm.tsx — aucun changement de comportement.

export default function ImageDropzone({ images, onChange }: { images: string[]; onChange: (imgs: string[]) => void }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cropQueue, setCropQueue] = useState<{ src: string; file: File }[]>([])

  async function uploadBlob(blob: Blob, originalFile: File): Promise<string | null> {
    const mime = blob.type || 'image/jpeg'
    const ext  = mime.includes('webp') ? 'webp' : mime.includes('png') ? 'png' : 'jpg'
    const form = new FormData()
    form.append('file', new File([blob], `${originalFile.name.replace(/\.[^.]+$/, '')}.${ext}`, { type: mime }))
    const res  = await fetch('/api/admin/upload/product-image', { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Erreur upload'); return null }
    return data.url
  }

  const onDrop = useCallback(async (accepted: File[]) => {
    if (!accepted.length) return
    setError(null)
    const files = accepted.slice(0, 6 - images.length)
    if (!files.length) return

    // Ouvre le crop sur le premier fichier, les suivants sont mis en queue
    const queue = files.map((file) => ({ src: URL.createObjectURL(file), file }))
    setCropQueue(queue)
  }, [images.length])

  async function handleCropConfirm(blob: Blob) {
    const current = cropQueue[0]
    if (!current) return

    setUploading(true)
    const url = await uploadBlob(blob, current.file)
    URL.revokeObjectURL(current.src)

    const remaining = cropQueue.slice(1)
    setCropQueue(remaining)

    if (url) onChange([...images, url])
    setUploading(false)

    // S'il reste des images en queue, le prochain modal s'ouvre automatiquement
  }

  function handleCropCancel() {
    // Annule l'image courante, passe à la suivante
    const current = cropQueue[0]
    if (current) URL.revokeObjectURL(current.src)
    setCropQueue((q) => q.slice(1))
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [], 'image/avif': [], 'image/heic': [], 'image/heif': [] },
    maxFiles: 6 - images.length,
    disabled: uploading || images.length >= 6,
    noClick: true,
  })

  function removeImage(url: string) {
    onChange(images.filter((u) => u !== url))
  }

  return (
    <div className="space-y-3">
      {/* Miniatures existantes */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <div key={i} className="group relative h-20 w-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" loading="lazy" className="h-full w-full rounded-xl object-cover border border-[var(--line)]" />
              <div className="absolute -left-1.5 -top-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <Tooltip content="Télécharger">
                  <a
                    href={`/api/admin/download?url=${encodeURIComponent(url)}`}
                    download
                    className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-bg-3 text-ink-1 hover:bg-amber hover:text-bg-0"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
                    </svg>
                  </a>
                </Tooltip>
              </div>
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M2 2l6 6M8 2l-6 6" />
                </svg>
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-medium text-white">principal</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Zone de dépôt */}
      {images.length < 6 && (
        <div
          {...getRootProps()}
          className={[
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-all',
            isDragActive ? 'border-amber bg-amber/5 text-amber' : 'border-[var(--line)] text-ink-3 hover:border-amber/50 hover:text-ink-2',
            (uploading || images.length >= 6) ? 'pointer-events-none opacity-40' : '',
          ].join(' ')}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <svg className="animate-spin text-amber" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" /></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
          )}
          <div>
            <p className="text-sm font-medium">
              {isDragActive ? 'Déposer ici' : uploading ? 'Upload en cours…' : 'Glisser une image ou'}
            </p>
            <p className="text-[11px]">JPG, PNG, WebP · max 5 Mo · {6 - images.length} image{6 - images.length > 1 ? 's' : ''} restante{6 - images.length > 1 ? 's' : ''}</p>
          </div>
          {!uploading && (
            <label className="rounded-lg border border-[var(--line-amber)] bg-amber/10 px-3 py-1.5 text-xs font-medium text-amber hover:bg-amber/20 transition-colors cursor-pointer">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
                multiple={images.length < 5}
                className="sr-only"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? [])
                  if (files.length) onDrop(files)
                  e.target.value = ''
                }}
              />
              Choisir depuis l&apos;appareil
            </label>
          )}
        </div>
      )}

      {error && <p className="text-[12px] text-red-400">{error}</p>}

      {/* Modal de crop — s'ouvre pour chaque image sélectionnée */}
      {cropQueue.length > 0 && (
        <ImageCropModal
          src={cropQueue[0].src}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  )
}
