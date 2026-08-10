import 'dotenv/config'
import { sendNewsletterWelcome } from '../src/lib/resend'

const email  = process.argv[2]
const locale = (process.argv[3] ?? 'fr') as 'fr' | 'en'

if (!email) {
  console.error('Usage : npx tsx scripts/test-newsletter-email.ts <email> [fr|en]')
  process.exit(1)
}

console.log(`[test] Envoi email newsletter → ${email} (locale: ${locale})`)

sendNewsletterWelcome(email, locale)
  .then(() => console.log('[test] Email envoyé avec succès'))
  .catch((err: unknown) => { console.error('[test] Erreur:', err); process.exit(1) })
