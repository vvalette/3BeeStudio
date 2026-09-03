'use client'

/**
 * Comment le client va régler : lien Stripe, ou virement.
 *
 * Partagé par l'envoi du devis (composé ou importé) et par la demande de solde.
 * En virement, aucune session Stripe n'est créée : un lien laissé ouvert finit
 * par être cliqué, et l'encaissement se ferait deux fois.
 */

export type QuotePaymentMode = 'stripe' | 'transfer'

const MODES: { value: QuotePaymentMode; label: string; hint: string }[] = [
  { value: 'stripe',   label: 'Lien de paiement',  hint: 'Le client paie en ligne, l’encaissement se pose tout seul.' },
  { value: 'transfer', label: 'Virement',          hint: 'Aucun lien envoyé : tu déclares l’encaissement à réception.' },
]

export default function PaymentModeToggle({
  value,
  onChange,
}: {
  value: QuotePaymentMode
  onChange: (mode: QuotePaymentMode) => void
}) {
  return (
    <div>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-3">
        Règlement
      </span>
      <div className="grid gap-2 sm:grid-cols-2">
        {MODES.map((mode) => {
          const active = value === mode.value
          return (
            <button
              key={mode.value}
              type="button"
              onClick={() => onChange(mode.value)}
              className={[
                'flex cursor-pointer flex-col gap-0.5 rounded-xl border px-3.5 py-2.5 text-left transition-colors',
                active ? 'border-[var(--line-amber)] bg-amber/5' : 'border-[var(--line)] hover:border-[var(--line-2)]',
              ].join(' ')}
            >
              <span className={['text-[13px] font-semibold', active ? 'text-amber' : 'text-ink-1'].join(' ')}>
                {mode.label}
              </span>
              <span className="text-[11px] leading-snug text-ink-3">{mode.hint}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
