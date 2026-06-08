import type { Metadata } from 'next'
import NfcOrderForm from '@/components/nfc/NfcOrderForm'

export const metadata: Metadata = {
  title: 'Porte-clé connecté NFC — 3BeeStudio',
  description: 'Porte-clé 3D avec puce NFC personnalisé à votre logo. Dès 10 unités.',
}

export default function NfcPage() {
  return (
    <main className="relative min-h-[calc(100dvh-72px)] overflow-hidden bg-bg-0">

      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
        style={{
          width: 800,
          height: 500,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.13), transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Hex grid */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]">
        <defs>
          <pattern id="nfc-hex" x="0" y="0" width="48" height="56" patternUnits="userSpaceOnUse">
            <path d="M24 1 L46 13 L46 39 L24 51 L2 39 L2 13 Z" fill="none" stroke="rgba(245,158,11,0.2)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#nfc-hex)" />
      </svg>

      <div className="relative mx-auto max-w-2xl px-4 pb-20 pt-8">

        {/* Header */}
        <div className="mb-12 text-center fade-up">
          <h1
            className="font-extrabold text-ink-0"
            style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', lineHeight: 1.05, letterSpacing: '-0.03em' }}
          >
            Porte-clé <span className="honey-text">connecté NFC</span>
          </h1>
          <p className="mt-4 text-ink-2" style={{ fontSize: '1.05rem', lineHeight: 1.6 }}>
            Imprimé en 3D · Logo personnalisé · Puce NFC programmée
          </p>

          {/* Trust strip */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-ink-3">
            <span className="flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1L8.5 5H13L9.5 7.5L11 12L7 9.5L3 12L4.5 7.5L1 5H5.5L7 1Z" fill="#F59E0B"/></svg>
              Fabriqué en France
            </span>
            <span className="h-3 w-px bg-[var(--line)]" />
            <span className="flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="2" y="5" width="10" height="8" rx="1.5" stroke="#F59E0B" strokeWidth="1.2"/><path d="M5 5V3.5a2 2 0 014 0V5" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round"/></svg>
              Paiement sécurisé Stripe
            </span>
            <span className="h-3 w-px bg-[var(--line)]" />
            <span>Réponse sous 24h</span>
          </div>
        </div>

        <NfcOrderForm />
      </div>
    </main>
  )
}
