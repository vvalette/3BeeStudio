import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, getSessionToken, verifyPassword } from '@/lib/auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(req: Request) {
  // Anti brute-force : 5 tentatives / 15 min / IP
  const ip = getClientIp(req)
  const { ok, retryAfter } = rateLimit(`admin-login:${ip}`, 5, 15 * 60 * 1000)
  if (!ok) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  const { password } = await req.json().catch(() => ({ password: null }))

  if (!verifyPassword(password)) {
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE_NAME, getSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE_NAME)
  return NextResponse.json({ ok: true })
}
