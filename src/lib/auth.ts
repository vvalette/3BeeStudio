import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'crypto'

export const ADMIN_COOKIE_NAME = 'admin_token'

// Durée de validité d'une session admin — alignée sur le maxAge du cookie (login route).
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 jours

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

// Signature dérivée du mot de passe + de l'expiration — un token volé devient inutilisable après `exp`,
// et changer ADMIN_PASSWORD invalide toutes les sessions existantes (comportement conservé).
function sign(exp: number): string {
  return createHmac('sha256', getAdminPassword())
    .update(`admin-session-v1.${exp}`)
    .digest('hex')
}

// Token de session structuré `exp.signature`. Le mot de passe brut n'est jamais stocké dans le cookie.
export function getSessionToken(): string {
  const exp = Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  return `${exp}.${sign(exp)}`
}

// Vérifie le mot de passe saisi au login (constant-time).
export function verifyPassword(input: unknown): boolean {
  if (typeof input !== 'string' || input.length === 0) return false
  return safeEqual(input, getAdminPassword())
}

// Vérifie le cookie de session présent sur les routes/pages admin (signature + expiration).
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value
  if (!token) return false

  const dotIndex = token.indexOf('.')
  if (dotIndex === -1) return false
  const expStr = token.slice(0, dotIndex)
  const signature = token.slice(dotIndex + 1)
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || exp < Date.now()) return false

  try {
    return safeEqual(signature, sign(exp))
  } catch {
    return false
  }
}
