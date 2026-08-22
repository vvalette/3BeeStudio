import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import type { Order } from '@/types/order'
import type { CustomOrder } from '@/types/custom-order'
import type { ShopOrder } from '@/types/shop-order'

/**
 * Export CSV des trois flux pour la déclaration URSSAF trimestrielle.
 *
 * Le CA se lisait à l'écran mais nulle part sous forme exploitable : il fallait
 * recopier à la main depuis trois onglets. Une ligne par commande, tous flux
 * confondus, triée par date.
 *
 * `GET /api/admin/export?from=2026-01-01&to=2026-03-31`
 * Les bornes sont optionnelles (tout l'historique par défaut) et incluses.
 *
 * Séparateur `;` et virgule décimale : Excel FR ouvre le fichier directement,
 * là où un CSV en `,` colle tout dans une seule colonne.
 */

const HEADERS = [
  'Date', 'Flux', 'Catégorie fiscale', 'Référence', 'Client', 'Email', 'Statut',
  'Montant encaissé (€)', 'Dont port (€)', 'Réduction (€)', 'Coût étiquette HT (€)', 'Marge port (€)',
  'Mode livraison', 'Suivi',
] as const

/**
 * Catégorie de chiffre d'affaires en micro-entreprise. Les deux relèvent de
 * plafonds, d'abattements et de taux de cotisations différents, donc doivent être
 * déclarés séparément : la vente d'un fichier n'est pas une vente de marchandise
 * mais une prestation de service / licence.
 *
 * ⚠️ Le classement retenu ici est indicatif — à faire confirmer par un comptable,
 * en particulier pour les acheteurs situés hors de France (services électroniques,
 * seuil de 10 000 € et guichet OSS).
 */
type FiscalCategory = 'Marchandises' | 'Services'

/** Un montant en centimes → « 12,34 » (virgule décimale, format FR). */
function euros(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return ''
  return (cents / 100).toFixed(2).replace('.', ',')
}

/** Échappement CSV : guillemets doublés dès que le champ contient ; " ou un saut de ligne. */
function cell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? '' : String(value)
  return /[";\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

interface Row {
  date: string
  flux: string
  categorie: FiscalCategory
  ref: string
  client: string
  email: string
  statut: string
  total: number
  port: number | null
  reduction: number | null
  coutEtiquette: number | null
  modeLivraison: string
  suivi: string | null
}

function toCsv(rows: Row[]): string {
  const lines = [HEADERS.join(';')]
  for (const r of rows) {
    const marge = r.port !== null && r.coutEtiquette !== null ? r.port - r.coutEtiquette : null
    lines.push([
      cell(r.date),
      cell(r.flux),
      cell(r.categorie),
      cell(r.ref),
      cell(r.client),
      cell(r.email),
      cell(r.statut),
      cell(euros(r.total)),
      cell(euros(r.port)),
      cell(euros(r.reduction)),
      cell(euros(r.coutEtiquette)),
      cell(euros(marge)),
      cell(r.modeLivraison),
      cell(r.suivi),
    ].join(';'))
  }
  return lines.join('\r\n')
}

export async function GET(req: Request) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const url  = new URL(req.url)
  const from = url.searchParams.get('from')
  const to   = url.searchParams.get('to')

  // `to` est inclus : on borne à la fin de la journée demandée, sinon un export
  // « jusqu'au 31/03 » perdrait toutes les commandes de ce jour-là.
  const toExclusive = to ? new Date(`${to}T23:59:59.999Z`).toISOString() : null

  // `column` : la période porte sur la date d'encaissement, qui n'est pas la même
  // colonne selon la ligne exportée — un solde sur-mesure se règle des semaines
  // après la création de la demande, et compte pour SA période, pas celle-ci.
  function applyRange<T extends { gte: (c: string, v: string) => T; lte: (c: string, v: string) => T }>(
    q: T,
    column = 'created_at',
  ): T {
    let out = q
    if (from) out = out.gte(column, new Date(`${from}T00:00:00.000Z`).toISOString())
    if (toExclusive) out = out.lte(column, toExclusive)
    return out
  }

  const [nfc, custom, customBalance, shop] = await Promise.all([
    applyRange(supabaseAdmin.from('orders').select('*')),
    applyRange(supabaseAdmin.from('custom_orders').select('*')),
    applyRange(
      supabaseAdmin.from('custom_orders').select('*').not('balance_paid_at', 'is', null),
      'balance_paid_at',
    ),
    applyRange(supabaseAdmin.from('shop_orders').select('*')),
  ])

  if (nfc.error || custom.error || customBalance.error || shop.error) {
    const err = nfc.error ?? custom.error ?? customBalance.error ?? shop.error
    return NextResponse.json({ error: err?.message ?? 'Erreur export' }, { status: 500 })
  }

  const rows: Row[] = [
    ...((nfc.data ?? []) as Order[]).map((o) => ({
      date: o.created_at,
      flux: 'NFC',
      categorie: 'Marchandises' as FiscalCategory,
      ref: o.id.slice(0, 8).toUpperCase(),
      client: o.company,
      email: o.email,
      statut: o.status,
      total: o.total_amount,
      port: null,
      reduction: null,
      coutEtiquette: o.shipping_cost,
      modeLivraison: 'livraison',
      suivi: o.tracking_number,
    })),
    // Sur-mesure : deux encaissements distincts, donc deux lignes. L'acompte est
    // daté de la commande, le solde de son propre règlement — c'est la date
    // d'encaissement qui fait foi pour la déclaration de CA.
    ...((custom.data ?? []) as CustomOrder[]).map((o) => ({
      date: o.created_at,
      flux: 'Sur-mesure (acompte)',
      categorie: 'Services' as FiscalCategory,
      ref: o.id.slice(0, 8).toUpperCase(),
      // `||` et non `??` : company vaut '' (pas null) pour une demande de particulier.
      client: o.company || o.name,
      email: o.email,
      statut: o.status,
      total: o.deposit_amount ?? 0,
      port: null,
      reduction: null,
      // Porté par la ligne d'acompte : l'étiquette est une dépense unique, la
      // compter deux fois gonflerait les frais d'expédition du mois.
      coutEtiquette: o.shipping_cost,
      modeLivraison: 'livraison',
      suivi: o.tracking_number,
    })),
    ...((customBalance.data ?? []) as CustomOrder[])
      .filter((o) => o.balance_amount)
      .map((o) => ({
        date: o.balance_paid_at!,
        flux: 'Sur-mesure (solde)',
        categorie: 'Services' as FiscalCategory,
        ref: o.id.slice(0, 8).toUpperCase(),
        client: o.company || o.name,
        email: o.email,
        statut: o.status,
        total: o.balance_amount ?? 0,
        port: null,
        reduction: null,
        coutEtiquette: null,
        modeLivraison: 'livraison',
        suivi: o.tracking_number,
      })),
    ...((shop.data ?? []) as ShopOrder[]).map((o) => ({
      date: o.created_at,
      // Une commande mixte est classée en Marchandises : c'est le colis qui domine.
      // Les commandes 100 % fichiers basculent en Services.
      flux: o.has_digital && !o.has_physical ? 'Boutique (fichiers)' : 'Boutique',
      categorie: (o.has_digital && !o.has_physical ? 'Services' : 'Marchandises') as FiscalCategory,
      ref: o.id.slice(0, 8).toUpperCase(),
      client: o.name,
      email: o.email,
      statut: o.status,
      total: o.total_amount,
      port: o.shipping,
      reduction: o.discount_amount ?? 0,
      coutEtiquette: o.shipping_cost ?? null,
      modeLivraison: o.delivery_mode,
      suivi: o.tracking_number,
    })),
  ]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((r) => ({ ...r, date: new Date(r.date).toLocaleDateString('fr-FR') }))

  const label = from || to ? `${from ?? 'debut'}_${to ?? 'aujourdhui'}` : 'tout'
  // BOM UTF-8 : sans lui Excel FR affiche « CommandÃ© » à la place des accents.
  const csv = '﻿' + toCsv(rows)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="3beestudio-commandes-${label}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
