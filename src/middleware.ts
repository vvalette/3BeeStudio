import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Exclut : API, Next.js internals, Vercel, admin, fichiers statiques
  matcher: ['/((?!api|_next|_vercel|admin|.*\\..*).*)'],
}
