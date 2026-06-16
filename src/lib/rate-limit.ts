// Limiteur de débit en mémoire (fenêtre fixe glissante).
// Suffisant pour une micro-entreprise à faible trafic.
// Note : en serverless multi-instance, la protection est best-effort (par instance).
// Pour une garantie forte et partagée, migrer vers @upstash/ratelimit + Redis.

type Entry = { count: number; resetAt: number }

const store = new Map<string, Entry>()

// Purge des entrées expirées pour éviter la fuite mémoire.
function prune(now: number) {
  if (store.size < 5000) return
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  prune(now)

  const entry = store.get(key)
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }

  if (entry.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { ok: true, retryAfter: 0 }
}

// IP cliente derrière le proxy Vercel.
export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}
