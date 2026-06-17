'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'

interface Props {
  src: string
  onConfirm: (blob: Blob) => void
  onCancel: () => void
}

const RATIOS = [
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 },
  { label: 'Libre', value: 0 },
]

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = reject
    i.src = imageSrc
  })

  // Limite la taille du canvas à 1920px (mémoire mobile)
  const MAX = 1920
  const scale = Math.min(1, MAX / Math.max(pixelCrop.width, pixelCrop.height))
  const w = Math.round(pixelCrop.width * scale)
  const h = Math.round(pixelCrop.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width  = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, w, h)

  return new Promise((resolve, reject) => {
    // WebP n'est pas encodable depuis canvas sur iOS Safari — fallback JPEG
    canvas.toBlob((blob) => {
      if (blob) { resolve(blob); return }
      canvas.toBlob((jpegBlob) => {
        jpegBlob ? resolve(jpegBlob) : reject(new Error('Impossible de convertir l\'image'))
      }, 'image/jpeg', 0.92)
    }, 'image/webp', 0.92)
  })
}

export default function ImageCropModal({ src, onConfirm, onCancel }: Props) {
  const [crop, setCrop]           = useState({ x: 0, y: 0 })
  const [zoom, setZoom]           = useState(1)
  const [ratioIdx, setRatioIdx]   = useState(0)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const selectedRatio = RATIOS[ratioIdx]

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels)
  }, [])

  async function handleConfirm() {
    if (!croppedArea) return
    setError(null)
    setLoading(true)
    try {
      const blob = await getCroppedBlob(src, croppedArea)
      onConfirm(blob)
    } catch {
      setError('Erreur lors du recadrage — essaie avec une autre photo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 sm:p-4">
      <div className="flex w-full max-w-lg flex-col gap-4 rounded-t-2xl sm:rounded-2xl border border-[var(--line)] bg-bg-1 p-5 max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-0">Recadrer l'image</h2>
          <button type="button" onClick={onCancel} className="cursor-pointer text-ink-3 hover:text-ink-0 transition-colors">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l10 10M14 4L4 14" />
            </svg>
          </button>
        </div>

        {/* Ratio */}
        <div className="flex gap-2">
          {RATIOS.map((r, i) => (
            <button
              key={r.label}
              type="button"
              onClick={() => setRatioIdx(i)}
              className={[
                'cursor-pointer rounded-lg px-3 py-1 text-xs font-medium transition-colors',
                i === ratioIdx
                  ? 'bg-amber text-bg-0'
                  : 'border border-[var(--line)] text-ink-2 hover:border-amber/50',
              ].join(' ')}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Zone crop */}
        <div className="relative h-52 sm:h-72 w-full overflow-hidden rounded-xl bg-bg-0">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={selectedRatio.value || undefined}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid={false}
            style={{
              containerStyle: { borderRadius: '12px' },
              cropAreaStyle:  { border: '2px solid #F59E0B', borderRadius: '8px' },
            }}
          />
        </div>

        {/* Zoom slider */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-ink-3 w-10">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 cursor-pointer accent-amber"
          />
          <span className="text-[11px] text-ink-3 w-8 text-right">{zoom.toFixed(1)}×</span>
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-xl border border-[var(--line)] px-4 py-2 text-sm text-ink-2 hover:border-amber/50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="cursor-pointer rounded-xl bg-amber px-4 py-2 text-sm font-semibold text-bg-0 hover:bg-amber-soft transition-colors disabled:opacity-50"
          >
            {loading ? 'En cours…' : 'Recadrer & importer'}
          </button>
        </div>
      </div>
    </div>
  )
}
