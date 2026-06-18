import 'dotenv/config'
import { sendNewsletterWelcome } from '../src/lib/resend'

const email  = process.argv[2] ?? 'valentin.valette11@gmail.com'
const locale = (process.argv[3] ?? 'fr') as 'fr' | 'en'

console.log(`[test] Envoi email newsletter → ${email} (locale: ${locale})`)

sendNewsletterWelcome(email, locale)
  .then(() => console.log('[test] Email envoyé avec succès'))
  .catch((err: unknown) => { console.error('[test] Erreur:', err); process.exit(1) })
