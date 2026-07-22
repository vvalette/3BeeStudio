import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Limiteur de débit à deux niveaux :
//  - Upstash Redis (partagé entre toutes les instances serverless) dès que
//    UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN sont définis ;
//  - sinon fallback en mémoire (fenêtre fixe) — best-effort par instance,
//    suffisant pour une micro-entreprise à faible trafic sans Redis.
// Une panne Upstash retombe aussi sur la mémoire : on ne bloque jamais un
// client légitime à cause du limiteur lui-même.

type Entry = { count: number; resetAt: number }

const store = new Map<string, Entry>()

// Purge des entrées expirées pour éviter la fuite mémoire.
function prune(now: number) {
  if (store.size < 5000) return
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}

function memoryRateLimit(
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

// ── Upstash (lazy, optionnel) ─────────────────────────────────────────────────

let redis: Redis | null | undefined
function getRedis(): Redis | null {
  if (redis !== undefined) return redis
  redis =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
      ? Redis.fromEnv()
      : null
  return redis
}

// Une instance Ratelimit par configuration (limite, fenêtre).
const limiters = new Map<string, Ratelimit>()

function getLimiter(r: Redis, limit: number, windowMs: number): Ratelimit {
  const id = `${limit}:${windowMs}`
  let rl = limiters.get(id)
  if (!rl) {
    rl = new Ratelimit({
      redis: r,
      limiter: Ratelimit.fixedWindow(limit, `${windowMs} ms`),
      prefix: 'rl',
    })
    limiters.set(id, rl)
  }
  return rl
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfter: number }> {
  const r = getRedis()
  if (r) {
    try {
      const res = await getLimiter(r, limit, windowMs).limit(key)
      return {
        ok: res.success,
        retryAfter: res.success ? 0 : Math.max(1, Math.ceil((res.reset - Date.now()) / 1000)),
      }
    } catch (err) {
      console.error('[rate-limit] Upstash indisponible — fallback mémoire:', err)
    }
  }
  return memoryRateLimit(key, limit, windowMs)
}

// IP cliente derrière le proxy Vercel.
export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}
