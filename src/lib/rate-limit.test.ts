import { describe, it, expect, vi } from 'vitest'
import { rateLimit, getClientIp } from './rate-limit'

describe('rateLimit', () => {
  it('allows requests under the limit', () => {
    const key = `test-${Math.random()}`
    expect(rateLimit(key, 3, 1000).ok).toBe(true)
    expect(rateLimit(key, 3, 1000).ok).toBe(true)
    expect(rateLimit(key, 3, 1000).ok).toBe(true)
  })

  it('blocks once the limit is exceeded and reports retryAfter', () => {
    const key = `test-${Math.random()}`
    rateLimit(key, 2, 1000)
    rateLimit(key, 2, 1000)
    const result = rateLimit(key, 2, 1000)
    expect(result.ok).toBe(false)
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  it('resets the window after it expires', () => {
    vi.useFakeTimers()
    const key = `test-${Math.random()}`
    rateLimit(key, 1, 1000)
    expect(rateLimit(key, 1, 1000).ok).toBe(false)
    vi.advanceTimersByTime(1001)
    expect(rateLimit(key, 1, 1000).ok).toBe(true)
    vi.useRealTimers()
  })

  it('tracks separate keys independently', () => {
    const a = `test-a-${Math.random()}`
    const b = `test-b-${Math.random()}`
    rateLimit(a, 1, 1000)
    expect(rateLimit(a, 1, 1000).ok).toBe(false)
    expect(rateLimit(b, 1, 1000).ok).toBe(true)
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
