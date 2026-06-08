import { NextResponse } from 'next/server'

type Status = 'ok' | 'notfound' | 'unknown' | 'skip'

// Types dont on tente une vérification d'existence
const VERIFIABLE = ['instagram', 'tiktok', 'website', 'other']

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

export async function POST(req: Request) {
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
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': UA, 'Accept-Language': 'fr-FR,fr;q=0.9' },
      signal: controller.signal,
    })

    if (res.status === 404 || res.status === 410) {
      return NextResponse.json({ status: 'notfound' as Status })
    }

    if (res.status >= 200 && res.status < 400) {
      // Instagram/TikTok renvoient parfois 200 même pour un compte inexistant :
      // on cherche des marqueurs "page introuvable" dans le HTML.
      if (type === 'instagram' || type === 'tiktok') {
        const html = await res.text()
        const notFound =
          /page isn'?t available|page introuvable|sorry, this page|couldn'?t find this account|n'?est pas disponible/i.test(html)
        if (notFound) return NextResponse.json({ status: 'notfound' as Status })
      }
      return NextResponse.json({ status: 'ok' as Status })
    }

    // 401/403/999 (blocage anti-bot, ex: LinkedIn) → on ne sait pas
    return NextResponse.json({ status: 'unknown' as Status })
  } catch {
    return NextResponse.json({ status: 'unknown' as Status })
  } finally {
    clearTimeout(timeout)
  }
}
