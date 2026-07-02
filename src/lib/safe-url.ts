import { lookup } from 'dns/promises'
import net from 'net'

// Bloque les IP privées / réservées (anti-SSRF).
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) || // link-local / métadonnées cloud
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) // CGNAT
    )
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase()
    // IPv4-mapped → vérifier la partie IPv4 embarquée
    if (lower.startsWith('::ffff:')) {
      const v4 = lower.slice(7)
      return net.isIPv4(v4) ? isPrivateIp(v4) : true
    }
    return (
      lower === '::1' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe80')
    )
  }
  return true // inconnu → on bloque
}

// Valide qu'une URL est publique et http(s). Résout le DNS et rejette les IP privées.
export async function assertSafeUrl(raw: string): Promise<URL | null> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

  const host = url.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    return null
  }

  try {
    const results = await lookup(host, { all: true })
    if (results.length === 0 || results.some((r) => isPrivateIp(r.address))) return null
  } catch {
    return null
  }
  return url
}
