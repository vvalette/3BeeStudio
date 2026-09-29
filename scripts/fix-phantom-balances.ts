/**
 * Nettoyage des soldes fantômes sur-mesure.
 *
 * Usage :
 *   npx tsx scripts/fix-phantom-balances.ts           → liste seulement (dry-run)
 *   npx tsx scripts/fix-phantom-balances.ts --apply   → corrige
 *
 * Une demande est incohérente quand son `balance_amount` dépasse
 * `total − acompte` (typiquement : acompte égal au total, et un solde du montant
 * total quand même enregistré), ou quand l'encaissé dépasse le total.
 *
 * `--apply` efface le solde (montant, lien, session, et déclaration manuelle
 * d'encaissement s'il y en a une). Jamais touché :
 *   - l'acompte (`deposit_*`), réglé en une fois compris
 *   - un solde réglé par Stripe : l'argent est réellement arrivé, il se
 *     rembourse depuis le dashboard. Le script le signale et passe.
 *
 * Même règle que le bouton « Supprimer le solde » de la fiche admin
 * (`balanceAnomaly` dans `src/types/custom-order.ts`).
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { balanceAnomaly, type CustomOrder } from '../src/types/custom-order'

const apply = process.argv.includes('--apply')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !supabaseKey) { console.error('❌  Variables Supabase manquantes dans .env.local'); process.exit(1) }

const supabase = createClient(supabaseUrl, supabaseKey)
const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey) : null

const euros = (cents: number | null) => cents === null ? '—' : `${(cents / 100).toFixed(2)} €`
const day = (iso: string | null) => iso ? iso.slice(0, 10) : 'sans date'

function paymentLines(o: CustomOrder): string[] {
  const lines: string[] = []
  if (o.deposit_amount !== null) {
    const label = o.deposit_amount === o.total_amount ? 'Réglé en une fois' : 'Acompte'
    const state = o.deposit_paid_at
      ? `reçu le ${day(o.deposit_paid_at)} (${o.deposit_method ?? 'moyen inconnu'})`
      : `statut ${o.status}`
    lines.push(`${label} ${euros(o.deposit_amount)} · ${state}`)
  }
  if (o.balance_amount !== null) {
    const state = o.balance_paid_at
      ? `reçu le ${day(o.balance_paid_at)} (${o.balance_method ?? 'moyen inconnu'})`
      : o.balance_payment_url ? 'lien envoyé, non réglé' : 'non réclamé'
    lines.push(`Solde ${euros(o.balance_amount)} · ${state}`)
  }
  return lines
}

async function main() {
  const { data, error } = await supabase
    .from('custom_orders')
    .select('*')
    .not('balance_amount', 'is', null)

  if (error) { console.error('❌  Lecture impossible :', error.message); process.exit(1) }

  const flagged = (data as CustomOrder[])
    .map((order) => ({ order, anomaly: balanceAnomaly(order) }))
    .filter((r): r is { order: CustomOrder; anomaly: NonNullable<typeof r.anomaly> } => r.anomaly !== null)

  console.log(`${apply ? '🔧  APPLY' : '🔎  DRY-RUN'} · ${data.length} demande(s) avec un solde, ${flagged.length} incohérente(s)\n`)

  for (const { order: o, anomaly } of flagged) {
    console.log(`• ${o.id} · ${o.name}`)
    console.log(`  total ${euros(o.total_amount)} · acompte ${euros(o.deposit_amount)} · encaissé ${euros(anomaly.amountPaid)} · solde max ${euros(anomaly.cap)}`)
    console.log(`  problème : ${anomaly.kind === 'overpaid' ? 'encaissé > total' : 'solde au-delà de total − acompte'}`)
    for (const line of paymentLines(o)) console.log(`    - ${line}`)

    if (anomaly.paidByStripe) {
      console.log('  ⚠️  solde réglé par Stripe : non modifié, à rembourser à la main\n')
      continue
    }
    if (!apply) {
      console.log(`  → --apply effacerait le solde${o.balance_paid_at ? ' et sa déclaration d\'encaissement' : ''}\n`)
      continue
    }

    if (o.balance_session_id && !o.balance_paid_at) {
      if (!stripe) {
        console.log(`  ⚠️  STRIPE_SECRET_KEY absente : expire la session ${o.balance_session_id} à la main`)
      } else {
        try {
          await stripe.checkout.sessions.expire(o.balance_session_id)
          console.log('  session Stripe expirée')
        } catch (err) {
          console.log(`  ⚠️  session ${o.balance_session_id} non expirée (${err instanceof Error ? err.message : err}) : vérifie-la dans Stripe`)
        }
      }
    }

    const { error: updateError } = await supabase
      .from('custom_orders')
      .update({
        balance_amount:      null,
        balance_payment_url: null,
        balance_session_id:  null,
        balance_paid_at:     null,
        balance_method:      null,
        updated_at:          new Date().toISOString(),
      })
      .eq('id', o.id)
      // Garde-fou : ne jamais écraser un solde Stripe réglé entre la lecture et l'écriture.
      .or('balance_method.is.null,balance_method.neq.stripe')

    console.log(updateError ? `  ❌  ${updateError.message}\n` : '  ✅  solde effacé\n')
  }

  if (!apply && flagged.some((r) => !r.anomaly.paidByStripe)) {
    console.log('Rien n\'a été modifié. Relancer avec --apply pour corriger.')
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
