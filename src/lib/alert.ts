import { Resend } from 'resend'
import { rateLimit } from '@/lib/rate-limit'

// Alertes ops par email (Resend) pour les erreurs critiques des flux de paiement :
// échec d'update DB dans le webhook Stripe, erreur checkout, survente de stock.
// Sans ça, ces erreurs ne vivent que dans les logs Vercel (rétention courte) et
// une commande payée peut rester bloquée en `pending_payment` sans que personne ne le voie.
//
// Ne lève JAMAIS : une alerte qui échoue ne doit pas casser le flux appelant
// (un webhook qui retourne 500 à cause de l'alerte serait contre-productif).

const ALERT_TO = process.env.ALERT_EMAIL ?? 'contact@3beestudio.fr'

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export type AlertContext = Record<string, string | number | boolean | null | undefined>

export async function sendCriticalAlert(subject: string, context: AlertContext = {}): Promise<void> {
  try {
    // Anti-tempête : Stripe rejoue les webhooks en échec → max 1 email / 15 min
    // par sujet (best-effort par instance, comme le rate limiting).
    const { ok } = await rateLimit(`critical-alert:${subject}`, 1, 15 * 60 * 1000)
    if (!ok) return

    const from = process.env.RESEND_FROM_EMAIL
    if (!from || !process.env.RESEND_API_KEY) {
      console.error('[alert] Resend non configuré — alerte non envoyée:', subject)
      return
    }

    const rows = Object.entries(context)
      .filter(([, v]) => v !== undefined)
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#54545A;font-family:monospace;font-size:13px;vertical-align:top">${escapeHtml(k)}</td>` +
          `<td style="padding:4px 0;font-family:monospace;font-size:13px;word-break:break-all">${escapeHtml(String(v))}</td></tr>`,
      )
      .join('')

    const html =
      `<div style="font-family:sans-serif;max-width:560px">` +
      `<h2 style="color:#B45309">🚨 ${escapeHtml(subject)}</h2>` +
      `<table style="border-collapse:collapse">${rows}</table>` +
      `<p style="color:#54545A;font-size:12px;margin-top:16px">Alerte automatique 3beestudio.fr — ${new Date().toISOString()}</p>` +
      `</div>`

    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from,
      to: ALERT_TO,
      subject: `🚨 [3BeeStudio] ${subject}`,
      html,
    })

    if (error) console.error('[alert] Envoi échoué:', JSON.stringify(error))
    else console.info('[alert]', JSON.stringify({ type: 'critical_alert_sent', subject }))
  } catch (err) {
    console.error('[alert] Erreur inattendue (non bloquante):', err)
  }
}
