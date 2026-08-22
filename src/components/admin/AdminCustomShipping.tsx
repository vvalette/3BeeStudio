'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { volumetricWeight } from '@/lib/boxtal'
import { formatPrice } from '@/lib/utils'
import { computeBalance, type CustomOrder } from '@/types/custom-order'

/**
 * Étiquette Boxtal d'un projet sur-mesure.
 *
 * Le colis est saisi à la main : contrairement au NFC (poids déduit de la
 * quantité) et à la boutique (poids en fiche produit), une pièce unique n'a pas
 * de poids connu d'avance. Le poids facturé est affiché en direct, parce que
 * les transporteurs facturent au max(poids réel, volumétrique) et qu'un carton
 * trop grand coûte cher sans qu'on s'en aperçoive.
 */

const DEFAULT_PACKAGE = { length: '30', width: '20', height: '10' }

const numClass = 'w-full rounded-lg border border-[var(--line-2)] bg-bg-2 px-3 py-2 font-mono text-sm text-ink-0 placeholder:text-ink-3 transition-colors focus:border-amber/50 focus:outline-none'

function int(value: string): number {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export default function AdminCustomShipping({
  order,
  onShipped,
}: {
  order: CustomOrder
  onShipped: (patch: Partial<CustomOrder>) => void
}) {
  const router = useRouter()
  const [weight, setWeight] = useState(order.package_weight_grams ? String(order.package_weight_grams) : '')
  const [length, setLength] = useState(order.package_length_cm ? String(order.package_length_cm) : DEFAULT_PACKAGE.length)
  const [width,  setWidth]  = useState(order.package_width_cm ? String(order.package_width_cm) : DEFAULT_PACKAGE.width)
  const [height, setHeight] = useState(order.package_height_cm ? String(order.package_height_cm) : DEFAULT_PACKAGE.height)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [labelUrl, setLabelUrl] = useState<string | null>(null)

  const shipped = !!order.boxtal_order_id
  const grams = int(weight)
  const pkg = { length: int(length), width: int(width), height: int(height) }
  const realKg = Math.round(grams) / 1000
  const volumeKg = pkg.length && pkg.width && pkg.height ? volumetricWeight(pkg) : 0
  const billedKg = Math.max(realKg, volumeKg)
  const ready = grams > 0 && pkg.length > 0 && pkg.width > 0 && pkg.height > 0

  // Le solde était censé être encaissé avant que le colis parte — on le signale
  // sans bloquer : un arrangement (remise en main propre, virement) reste possible.
  const balanceDue = computeBalance(order)
  const balanceUnpaid = !order.balance_paid_at && balanceDue ? balanceDue : null

  async function generateLabel() {
    setLoading(true)
    setError(null)
    setWarning(null)
    setLabelUrl(null)
    try {
      const res = await fetch(`/api/admin/custom/${order.id}/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight_grams: grams,
          length_cm: pkg.length,
          width_cm: pkg.width,
          height_cm: pkg.height,
        }),
      })
      const json = await res.json() as {
        error?: string; warning?: string
        label_url?: string; boxtal_order_id?: string; shipping_cost?: number | null
      }
      if (!res.ok) throw new Error(json.error ?? 'Erreur Boxtal')

      setLabelUrl(json.label_url ?? null)
      if (json.warning) setWarning(json.warning)
      onShipped({
        boxtal_order_id: json.boxtal_order_id ?? null,
        package_weight_grams: grams,
        package_length_cm: pkg.length,
        package_width_cm: pkg.width,
        package_height_cm: pkg.height,
        ...(json.shipping_cost != null ? { shipping_cost: json.shipping_cost } : {}),
      })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur Boxtal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {balanceUnpaid && (
        <div className="rounded-xl border border-amber/30 bg-amber/10 px-4 py-3">
          <p className="text-[13px] font-semibold text-amber">
            Solde de {formatPrice(balanceUnpaid)} non réglé
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-ink-2">
            {order.balance_payment_url
              ? 'La demande est partie, le client n’a pas encore payé.'
              : 'Aucune demande de solde envoyée pour l’instant.'}{' '}
            L’étiquette reste générable si tu as un autre arrangement.
          </p>
        </div>
      )}

      {shipped ? (
        <div className="rounded-xl border border-[var(--line)] bg-bg-2 p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">Colis déclaré</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[12px] text-ink-1">
            {order.package_weight_grams
              ? <span>{(order.package_weight_grams / 1000).toFixed(3)} kg</span>
              : <span className="text-ink-3">poids non enregistré</span>}
            {order.package_length_cm && (
              <span className="text-ink-3">
                {order.package_length_cm} × {order.package_width_cm} × {order.package_height_cm} cm
              </span>
            )}
            {order.shipping_cost != null && (
              <span className="text-amber">étiquette {formatPrice(order.shipping_cost)}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--line)] bg-bg-2 p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">Colis à déclarer</p>
          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <label htmlFor="pkg-weight" className="mb-1 block text-[10px] uppercase tracking-wider text-ink-3">Poids (g) *</label>
              <input id="pkg-weight" type="number" min="1" step="1" value={weight}
                onChange={(e) => setWeight(e.target.value)} placeholder="400" className={numClass} />
            </div>
            <div>
              <label htmlFor="pkg-l" className="mb-1 block text-[10px] uppercase tracking-wider text-ink-3">Long. (cm)</label>
              <input id="pkg-l" type="number" min="1" step="1" value={length}
                onChange={(e) => setLength(e.target.value)} className={numClass} />
            </div>
            <div>
              <label htmlFor="pkg-w" className="mb-1 block text-[10px] uppercase tracking-wider text-ink-3">Larg. (cm)</label>
              <input id="pkg-w" type="number" min="1" step="1" value={width}
                onChange={(e) => setWidth(e.target.value)} className={numClass} />
            </div>
            <div>
              <label htmlFor="pkg-h" className="mb-1 block text-[10px] uppercase tracking-wider text-ink-3">Haut. (cm)</label>
              <input id="pkg-h" type="number" min="1" step="1" value={height}
                onChange={(e) => setHeight(e.target.value)} className={numClass} />
            </div>
          </div>

          {ready && (
            <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[12px]">
              <span className="text-ink-1">{realKg.toFixed(3)} kg réel</span>
              <span className={volumeKg > realKg ? 'text-amber' : 'text-ink-3'}>vol. {volumeKg} kg</span>
              <span className="font-semibold text-ink-0">facturé ~{billedKg} kg</span>
            </div>
          )}
          {ready && volumeKg > realKg && (
            <p className="mt-1.5 text-[11px] leading-snug text-amber">
              Le volume prime sur le poids : c’est {billedKg} kg qui sera facturé. Un carton plus juste coûterait moins cher.
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
      {warning && <p className="text-xs text-amber">{warning}</p>}

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          onClick={generateLabel}
          disabled={loading || (!shipped && !ready)}
          className="flex h-[38px] cursor-pointer items-center gap-2 rounded-pill px-4 text-xs font-bold text-bg-0 transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: 'var(--btn-primary-bg)' }}
        >
          {loading ? (
            <>
              <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round" />
              </svg>
              Génération…
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.6 1.5H14v5.4l-7 7-5.4-5.4 7-7z" /><circle cx="11" cy="4.6" r="1" fill="currentColor" stroke="none" />
              </svg>
              {shipped ? 'Ré-télécharger l’étiquette' : 'Générer l’étiquette Boxtal'}
            </>
          )}
        </button>

        {labelUrl && (
          <a
            href={labelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[38px] items-center gap-1.5 rounded-pill border border-emerald-500/30 bg-emerald-500/10 px-4 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 2v7M7 9L4 6M7 9l3-3M2.5 11.5h9" />
            </svg>
            Étiquette PDF
          </a>
        )}
      </div>

      {!order.phone && !shipped && (
        <p className="text-[11px] leading-relaxed text-amber/80">
          Téléphone du client manquant — Boxtal l’exige pour la prise en charge.
        </p>
      )}

      <p className="text-[11px] leading-relaxed text-ink-3">
        Le passage en « Expédié » et le numéro de suivi arrivent tout seuls par le webhook Boxtal,
        à la prise en charge par le transporteur.
      </p>
    </div>
  )
}
