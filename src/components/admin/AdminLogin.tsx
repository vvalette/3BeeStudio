'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/admin/commandes')
      router.refresh()
    } else {
      setError('Mot de passe incorrect')
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-[calc(100dvh-65px)] items-center justify-center bg-bg-0 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-bg-1 p-8 shadow-card">
        <div className="mb-6 text-center">
          <span className="text-2xl">🐝</span>
          <h1 className="mt-2 text-lg font-bold text-ink-0">Admin 3BeeStudio</h1>
          <p className="text-sm text-ink-3">Accès réservé</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            className="w-full rounded-lg border border-[var(--line-2)] bg-bg-2 px-4 py-2.5 text-sm text-ink-0 placeholder:text-ink-3 focus:border-amber/50 focus:outline-none"
            autoFocus
          />

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-lg bg-amber py-2.5 text-sm font-bold text-bg-0 hover:bg-amber-soft disabled:opacity-40 transition-opacity"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </main>
  )
}
