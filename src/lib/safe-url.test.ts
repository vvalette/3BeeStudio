import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isPrivateIp } from './safe-url'

describe('isPrivateIp', () => {
  it('flags private IPv4 ranges', () => {
    expect(isPrivateIp('10.0.0.1')).toBe(true)
    expect(isPrivateIp('192.168.1.1')).toBe(true)
    expect(isPrivateIp('172.16.0.1')).toBe(true)
    expect(isPrivateIp('172.31.255.255')).toBe(true)
    expect(isPrivateIp('127.0.0.1')).toBe(true)
    expect(isPrivateIp('169.254.169.254')).toBe(true) // cloud metadata endpoint
    expect(isPrivateIp('100.64.0.1')).toBe(true) // CGNAT
    expect(isPrivateIp('0.0.0.0')).toBe(true)
  })

  it('allows public IPv4 addresses', () => {
    expect(isPrivateIp('8.8.8.8')).toBe(false)
    expect(isPrivateIp('1.1.1.1')).toBe(false)
    expect(isPrivateIp('172.32.0.1')).toBe(false) // just outside the 172.16-31 range
  })

  it('flags private/loopback IPv6 addresses', () => {
    expect(isPrivateIp('::1')).toBe(true)
    expect(isPrivateIp('fe80::1')).toBe(true)
    expect(isPrivateIp('fc00::1')).toBe(true)
    expect(isPrivateIp('fd12:3456::1')).toBe(true)
  })

  it('unwraps IPv4-mapped IPv6 addresses', () => {
    expect(isPrivateIp('::ffff:10.0.0.1')).toBe(true)
    expect(isPrivateIp('::ffff:8.8.8.8')).toBe(false)
  })

  it('allows public IPv6 addresses', () => {
    expect(isPrivateIp('2001:4860:4860::8888')).toBe(false)
  })

  it('blocks unparseable input by default', () => {
    expect(isPrivateIp('not-an-ip')).toBe(true)
  })
})

describe('assertSafeUrl', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('rejects malformed URLs', async () => {
    const { assertSafeUrl } = await import('./safe-url')
    expect(await assertSafeUrl('not a url')).toBeNull()
  })

  it('rejects non-http(s) protocols', async () => {
    const { assertSafeUrl } = await import('./safe-url')
    expect(await assertSafeUrl('ftp://example.com')).toBeNull()
    expect(await assertSafeUrl('file:///etc/passwd')).toBeNull()
  })

  it('rejects localhost and .internal hosts without a DNS lookup', async () => {
    const { assertSafeUrl } = await import('./safe-url')
    expect(await assertSafeUrl('http://localhost')).toBeNull()
    expect(await assertSafeUrl('http://foo.localhost')).toBeNull()
    expect(await assertSafeUrl('http://service.internal')).toBeNull()
  })

  it('rejects hosts resolving to a private IP', async () => {
    vi.doMock('dns/promises', () => ({
      lookup: vi.fn().mockResolvedValue([{ address: '10.0.0.5', family: 4 }]),
    }))
    const { assertSafeUrl } = await import('./safe-url')
    expect(await assertSafeUrl('http://internal-service.example.com')).toBeNull()
  })

  it('accepts hosts resolving to a public IP', async () => {
    vi.doMock('dns/promises', () => ({
      lookup: vi.fn().mockResolvedValue([{ address: '8.8.8.8', family: 4 }]),
    }))
    const { assertSafeUrl } = await import('./safe-url')
    const result = await assertSafeUrl('https://example.com/page')
    expect(result?.toString()).toBe('https://example.com/page')
  })

  it('rejects hosts that fail to resolve', async () => {
    vi.doMock('dns/promises', () => ({
      lookup: vi.fn().mockRejectedValue(new Error('ENOTFOUND')),
    }))
    const { assertSafeUrl } = await import('./safe-url')
    expect(await assertSafeUrl('https://does-not-exist.invalid')).toBeNull()
  })
})
