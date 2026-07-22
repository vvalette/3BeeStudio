import { describe, it, expect, vi } from 'vitest'
import { rateLimit, getClientIp } from './rate-limit'

// Sans UPSTASH_REDIS_REST_URL/TOKEN dans l'env de test, rateLimit utilise
// le fallback mémoire — c'est lui qui est testé ici.
describe('rateLimit (fallback mémoire)', () => {
  it('allows requests under the limit', async () => {
    const key = `test-${Math.random()}`
    expect((await rateLimit(key, 3, 1000)).ok).toBe(true)
    expect((await rateLimit(key, 3, 1000)).ok).toBe(true)
    expect((await rateLimit(key, 3, 1000)).ok).toBe(true)
  })

  it('blocks once the limit is exceeded and reports retryAfter', async () => {
    const key = `test-${Math.random()}`
    await rateLimit(key, 2, 1000)
    await rateLimit(key, 2, 1000)
    const result = await rateLimit(key, 2, 1000)
    expect(result.ok).toBe(false)
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  it('resets the window after it expires', async () => {
    vi.useFakeTimers()
    const key = `test-${Math.random()}`
    await rateLimit(key, 1, 1000)
    expect((await rateLimit(key, 1, 1000)).ok).toBe(false)
    vi.advanceTimersByTime(1001)
    expect((await rateLimit(key, 1, 1000)).ok).toBe(true)
    vi.useRealTimers()
  })

  it('tracks separate keys independently', async () => {
    const a = `test-a-${Math.random()}`
    const b = `test-b-${Math.random()}`
    await rateLimit(a, 1, 1000)
    expect((await rateLimit(a, 1, 1000)).ok).toBe(false)
    expect((await rateLimit(b, 1, 1000)).ok).toBe(true)
  })
})

describe('getClientIp', () => {
  it('reads the first IP from x-forwarded-for', () => {
    const req = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.1' },
    })
    expect(getClientIp(req)).toBe('203.0.113.1')
  })

  it('falls back to x-real-ip', () => {
    const req = new Request('https://example.com', {
      headers: { 'x-real-ip': '203.0.113.2' },
    })
    expect(getClientIp(req)).toBe('203.0.113.2')
  })

  it('returns "unknown" when no IP header is present', () => {
    const req = new Request('https://example.com')
    expect(getClientIp(req)).toBe('unknown')
  })
})
