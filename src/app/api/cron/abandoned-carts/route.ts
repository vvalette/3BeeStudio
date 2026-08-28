import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendAbandonedCartReminder } from '@/lib/resend'
import type { AbandonedCart } from '@/types/abandoned-cart'
import {
  REMINDER_MIN_HOURS,
  REMINDER_MAX_HOURS,
  REMINDER_BATCH_SIZE,
} from '@/types/abandoned-cart'

/**
 * Relance des paniers abandonnés (déclaré dans vercel.json).
 *
 * Fenêtre : entre 1 h et 48 h après l'abandon. Avant 1 h, le client est
 * peut-être encore en train de payer sur un autre onglet ou de retenter avec une
 * autre carte, et l'email arriverait comme un reproche. Après 48 h, ce n'est
 * plus un rappel d'achat en cours mais de la prospection.
 *
 * Un seul envoi par panier (`reminded_at`), et jamais à quelqu'un qui a demandé
 * à ne plus en recevoir (`abandoned_cart_optouts`) ou qui a fini par commander
 * de lui-même depuis l'abandon.
 *
 * Cadence attendue : toutes les heures. Une relance quotidienne arriverait
 * jusqu'à 24 h après l'abandon, soit à l'autre bout de la fenêtre utile.
 *
 * Protection : même contrat que /api/cron/low-stock (Bearer CRON_SECRET, fail-closed).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron/abandoned-carts] CRON_SECRET non configuré — requête refusée')
    return NextResponse.json({ error: 'Cron non configuré' }, { status: 503 })
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const now    = Date.now()
  const notAfter  = new Date(now - REMINDER_MIN_HOURS * 3600_000).toISOString()
  const notBefore = new Date(now - REMINDER_MAX_HOURS * 3600_000).toISOString()

  const { data, error } = await supabaseAdmin
    .from('abandoned_carts')
    .select('*')
    .is('reminded_at', null)
    .is('recovered_at', null)
    .gte('created_at', notBefore)
    .lte('created_at', notAfter)
    .order('created_at', { ascending: true })
    .limit(REMINDER_BATCH_SIZE)

  if (error) {
    console.error('[cron/abandoned-carts] erreur lecture paniers:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const carts = (data ?? []) as unknown as AbandonedCart[]
  if (carts.length === 0) {
    // Purge quand même : sans candidat à relancer, c'est le cas le plus fréquent,
    // et c'est justement là que le ménage ne se ferait jamais.
    const { data: purgedOnly } = await supabaseAdmin.rpc('purge_abandoned_carts')
    console.info('[cron/abandoned-carts]', JSON.stringify({ event: 'ok', candidats: 0, purged: purgedOnly ?? 0 }))
    return NextResponse.json({ checked: true, sent: 0, skipped: 0, purged: purgedOnly ?? 0 })
  }

  const emails = Array.from(new Set(carts.map((c) => c.email)))

  // Une seule requête pour les deux filtres par email plutôt qu'une par panier :
  // le cron doit tenir dans la durée d'exécution d'une fonction.
  const [{ data: optouts }, { data: paidOrders }] = await Promise.all([
    supabaseAdmin
      .from('abandoned_cart_optouts')
      .select('email')
      .in('email', emails),
    // Commandes réellement payées depuis la fenêtre : le client est revenu seul,
    // le relancer serait au mieux inutile, au pire inquiétant.
    supabaseAdmin
      .from('shop_orders')
      .select('email, created_at')
      .in('email', emails)
      .neq('status', 'pending_payment')
      .neq('status', 'cancelled')
      .gte('created_at', notBefore),
  ])

  const optedOut = new Set((optouts ?? []).map((o) => (o as { email: string }).email))
  const paidSince = new Map<string, string>()
  for (const row of (paidOrders ?? []) as { email: string; created_at: string }[]) {
    const known = paidSince.get(row.email)
    if (!known || row.created_at > known) paidSince.set(row.email, row.created_at)
  }

  let sent = 0
  let skipped = 0
  const failed: string[] = []

  for (const cart of carts) {
    const paidAt = paidSince.get(cart.email)
    const alreadyBought = paidAt !== undefined && paidAt > cart.created_at

    if (optedOut.has(cart.email) || alreadyBought) {
      // Marqué comme relancé sans envoi : la ligne sort définitivement de la
      // file, sinon elle serait réexaminée à chaque passage jusqu'à sa purge.
      await supabaseAdmin
        .from('abandoned_carts')
        .update({ reminded_at: new Date().toISOString() })
        .eq('id', cart.id)
      skipped++
      continue
    }

    try {
      await sendAbandonedCartReminder(cart)
      // Posé APRÈS l'envoi : si Resend échoue, le panier reste candidat au
      // prochain passage plutôt que de perdre sa relance.
      await supabaseAdmin
        .from('abandoned_carts')
        .update({ reminded_at: new Date().toISOString() })
        .eq('id', cart.id)
      sent++
    } catch (err) {
      console.error('[cron/abandoned-carts] envoi échoué:', cart.id, err instanceof Error ? err.message : String(err))
      failed.push(cart.id)
    }
  }

  // Purge ici plutôt que dans un 4e cron : un panier abandonné est une donnée
  // collectée pour une finalité qui s'éteint avec la relance, et la garder au-delà
  // de 90 jours n'aurait plus de base. Le DELETE est indexé et porte sur une table
  // qui reste petite, le passer à chaque tour ne coûte rien.
  const { data: purged, error: purgeError } = await supabaseAdmin.rpc('purge_abandoned_carts')
  if (purgeError) console.error('[cron/abandoned-carts] purge échouée:', purgeError.message)

  console.info('[cron/abandoned-carts]', JSON.stringify({
    event: 'processed', candidats: carts.length, sent, skipped, failed: failed.length, purged: purged ?? 0,
  }))

  return NextResponse.json({ checked: true, sent, skipped, failed: failed.length, purged: purged ?? 0 })
}
