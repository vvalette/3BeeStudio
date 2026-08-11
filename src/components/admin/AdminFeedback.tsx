'use client'

/**
 * Repère « saisie non enregistrée » à poser à côté d'un champ sans autosave.
 * Complète `useUnsavedWarning`, qui ne peut couvrir que la fermeture d'onglet.
 */
export function UnsavedDot({ label = 'Non sauvegardé' }: { label?: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-pill border border-amber/30 bg-amber/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber" />
      </span>
      {label}
    </span>
  )
}

/**
 * Bandeau succès / erreur partagé par les écrans admin, alimenté par
 * `useAdminMutation`. Un seul rendu pour les deux états : ils ne coexistent jamais
 * (une nouvelle mutation efface l'erreur précédente).
 */
export default function AdminFeedback({
  error,
  success,
  onDismiss,
  className = '',
}: {
  error?: string | null
  success?: string | null
  onDismiss?: () => void
  className?: string
}) {
  if (!error && !success) return null
  const isError = !!error

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live="polite"
      className={[
        'flex items-start gap-2 rounded-lg border px-4 py-2 text-sm',
        isError
          ? 'border-red-500/30 bg-red-500/10 text-red-400'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
        className,
      ].join(' ')}
    >
      <span className="mt-0.5 shrink-0">
        {isError ? (
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="7" cy="7" r="5.5" /><path d="M7 4.5v3M7 9.5v.01" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 7l3.5 3.5L12 4" />
          </svg>
        )}
      </span>
      <span className="min-w-0 flex-1">{error ?? success}</span>
      {isError && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fermer"
          className="shrink-0 cursor-pointer text-red-400/60 transition-colors hover:text-red-400"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 3l8 8M11 3l-8 8" />
          </svg>
        </button>
      )}
    </div>
  )
}
