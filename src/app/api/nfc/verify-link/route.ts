import { NextResponse } from 'next/server'
import { lookup } from 'dns/promises'
import net from 'net'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

type Status = 'ok' | 'notfound' | 'unknown' | 'skip'

// Types dont on tente une vérification d'existence
const VERIFIABLE = ['instagram', 'tiktok', 'website', 'other']

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

const MAX_REDIRECTS = 3
const MAX_BYTES = 512 * 1024 // 512 Ko suffisent pour détecter une page d'erreur

// Bloque les IP privées / réservées (anti-SSRF).
function isPrivateIp(ip: string): boolean {
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
async function assertSafeUrl(raw: string): Promise<URL | null> {
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

// Lit au plus MAX_BYTES du corps pour éviter d'aspirer des réponses énormes.
async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader()
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let total = 0
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    total += value.length
  }
  reader.cancel().catch(() => {})
  return new TextDecoder().decode(concat(chunks).slice(0, MAX_BYTES))
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out
}

export async function POST(req: Request) {
  // Limite : 20 vérifications / min / IP (l'endpoint fait des requêtes sortantes)
  const ip = getClientIp(req)
  const { ok } = rateLimit(`verify-link:${ip}`, 20, 60 * 1000)
  if (!ok) return NextResponse.json({ status: 'unknown' as Status })

  const { url, type } = await req.json().catch(() => ({}))

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ status: 'unknown' as Status })
  }
  if (!VERIFIABLE.includes(type)) {
    return NextResponse.json({ status: 'skip' as Status })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6000)

  try {
    // Suivi manuel des redirections : chaque hop est re-validé contre les IP privées.
    let current = url
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const safe = await assertSafeUrl(current)
      if (!safe) return NextResponse.json({ status: 'unknown' as Status })

      const res = await fetch(safe.toString(), {
        method: 'GET',
        redirect: 'manual',
        headers: { 'User-Agent': UA, 'Accept-Language': 'fr-FR,fr;q=0.9' },
        signal: controller.signal,
      })

      // Redirection → on valide la cible au tour suivant
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location')
        if (!loc) return NextResponse.json({ status: 'unknown' as Status })
        current = new URL(loc, safe).toString()
        continue
      }

      if (res.status === 404 || res.status === 410) {
        return NextResponse.json({ status: 'notfound' as Status })
      }

      if (res.status >= 200 && res.status < 300) {
        // Instagram/TikTok renvoient parfois 200 même pour un compte inexistant :
        // on cherche des marqueurs "page introuvable" dans le HTML.
        if (type === 'instagram' || type === 'tiktok') {
          const html = await readCapped(res)
          const notFound =
            /page isn'?t available|page introuvable|sorry, this page|couldn'?t find this account|n'?est pas disponible/i.test(html)
          if (notFound) return NextResponse.json({ status: 'notfound' as Status })
        }
        return NextResponse.json({ status: 'ok' as Status })
      }

      // 401/403/999 (blocage anti-bot, ex: LinkedIn) → on ne sait pas
      return NextResponse.json({ status: 'unknown' as Status })
    }

    // Trop de redirections
    return NextResponse.json({ status: 'unknown' as Status })
  } catch {
    return NextResponse.json({ status: 'unknown' as Status })
  } finally {
    clearTimeout(timeout)
  }
}
