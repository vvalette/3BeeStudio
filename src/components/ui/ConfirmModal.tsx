'use client'

import { useCallback, useState } from 'react'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void
}

function ConfirmModalUI({
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmOptions & { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,10,11,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-bg-1 p-6 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {variant === 'danger' && (
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
        )}
        <h2 className="font-semibold text-ink-0 leading-snug">{title}</h2>
        {message && (
          <p className="mt-2 text-sm text-ink-2 leading-relaxed">{message}</p>
        )}
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="cursor-pointer rounded-xl border border-[var(--line)] bg-bg-2 px-4 py-2 text-sm font-medium text-ink-1 transition-colors hover:bg-bg-3"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={[
              'cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
              variant === 'danger'
                ? 'border border-red-500/25 bg-red-500/15 text-red-400 hover:bg-red-500/25'
                : 'border border-amber/25 bg-amber/15 text-amber hover:bg-amber/25',
            ].join(' ')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...options, resolve })
    })
  }, [])

  function handleConfirm() {
    state?.resolve(true)
    setState(null)
  }

  function handleCancel() {
    state?.resolve(false)
    setState(null)
  }

  const modal = state ? (
    <ConfirmModalUI
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null

  return { confirm, modal }
}
