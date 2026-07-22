'use client'

import dynamic from 'next/dynamic'
import { labelClass } from './state'

const STLViewerWrapper = dynamic(() => import('@/components/boutique/STLViewerWrapper'), { ssr: false })

// Orientation du modèle 3D : viewer live + presets Y + sliders X/Y/Z.

export default function ModelRotationSection({ stlUrl, rotation, onChange }: {
  stlUrl: string
  rotation: { x: number; y: number; z: number }
  onChange: (r: { x: number; y: number; z: number }) => void
}) {
  return (
    <div>
      <div className="mb-2">
        <label className={labelClass}>Orientation du modèle 3D</label>
        <p className="text-[11px] text-ink-3 -mt-1">Ajuste l&apos;angle d&apos;affichage dans la boutique. La rotation X/Y/Z est en degrés.</p>
      </div>

      {/* Mini viewer live */}
      <div className="rounded-2xl overflow-hidden border border-[var(--line)] bg-bg-1 mb-4" style={{ height: 240 }}>
        <STLViewerWrapper url={stlUrl} height={240} rotation={rotation} />
      </div>

      {/* Presets Y rapides */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Preset Y</span>
        {[0, 90, 180, 270].map((deg) => (
          <button
            key={deg}
            type="button"
            onClick={() => onChange({ ...rotation, y: deg })}
            className={[
              'rounded-lg border px-3 py-1.5 font-mono text-[11px] font-semibold cursor-pointer transition-all',
              rotation.y === deg
                ? 'border-amber/50 bg-amber/15 text-amber'
                : 'border-[var(--line)] bg-bg-1 text-ink-3 hover:border-[var(--line-2)] hover:text-ink-1',
            ].join(' ')}
          >
            {deg}°
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange({ x: 0, y: 0, z: 0 })}
          className="ml-auto rounded-lg border border-[var(--line)] px-3 py-1.5 text-[11px] text-ink-3 cursor-pointer hover:text-ink-1 hover:border-[var(--line-2)] transition-colors"
        >
          Réinitialiser
        </button>
      </div>

      {/* Sliders X / Y / Z */}
      <div className="space-y-3">
        {(['x', 'y', 'z'] as const).map((axis) => (
          <div key={axis} className="flex items-center gap-3">
            <span className="w-4 text-center font-mono text-[11px] font-bold uppercase text-amber">{axis}</span>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={rotation[axis]}
              onChange={(e) => onChange({ ...rotation, [axis]: parseInt(e.target.value, 10) })}
              className="flex-1 cursor-pointer accent-amber"
            />
            <input
              type="number"
              min={-180}
              max={180}
              value={rotation[axis]}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (!isNaN(v)) onChange({ ...rotation, [axis]: Math.max(-180, Math.min(180, v)) })
              }}
              className="w-16 rounded-lg border border-[var(--line)] bg-bg-1 px-2 py-1 text-center font-mono text-[12px] text-ink-0 focus:outline-none focus:border-amber transition-colors"
            />
            <span className="w-2 text-[11px] text-ink-3">°</span>
          </div>
        ))}
      </div>
    </div>
  )
}
