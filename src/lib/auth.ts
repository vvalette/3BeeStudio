import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'crypto'

export const ADMIN_COOKIE_NAME = 'admin_token'

function getAdminPassword(): string {
  const pw = process.env.ADMIN_PASSWORD
  if (!pw) throw new Error('ADMIN_PASSWORD non défini')
  return pw
}

// Comparaison à temps constant — évite les timing attacks.
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

// Token de session dérivé du mot de passe via HMAC.
// Le mot de passe brut n'est jamais stocké dans le cookie.
export function getSessionToken(): string {
  return createHmac('sha256', getAdminPassword())
    .update('admin-session-v1')
    .digest('hex')
}

// Vérifie le mot de passe saisi au login (constant-time).
export function verifyPassword(input: unknown): boolean {
  if (typeof input !== 'string' || input.length === 0) return false
  return safeEqual(input, getAdminPassword())
}

// Vérifie le cookie de session présent sur les routes/pages admin.
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value
  if (!token) return false
  try {
    return safeEqual(token, getSessionToken())
  } catch {
    return false
  }
}
