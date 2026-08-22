/**
 * Devis PDF, servi à l'admin.
 *
 *  - GET  : le devis tel qu'il a été envoyé au client (données figées en base).
 *  - POST : un aperçu du brouillon en cours de saisie, sans rien enregistrer —
 *           c'est le même générateur, donc ce qu'on voit est ce qui partira.
 *
 * Le PDF n'est jamais stocké : il se reconstruit à l'identique depuis les
 * colonnes `quote_*`, ce qui évite un bucket de plus à gérer et à purger.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import { buildQuotePdf, quoteFileName } from '@/lib/quote/pdf'
import { nextQuoteNumber } from '@/lib/quote/number'
import { fallbackQuoteItems, fallbackQuoteObject, quoteItemSchema } from '@/lib/quote/input'
import type { CustomOrder } from '@/types/custom-order'

const previewSchema = z.object({
  quote_object:   z.string().trim().max(300).optional(),
  quote_items:    z.array(quoteItemSchema).min(1).max(40).optional(),
  deposit_amount: z.number().int().positive().optional(),
})

async function loadOrder(orderId: string): Promise<CustomOrder | null> {
  const { data } = await supabaseAdmin
    .from('custom_orders')
    .select('*')
    .eq('id', orderId)
    .single()
  return (data as CustomOrder | null) ?? null
}

/**
 * Sans ça, une erreur de génération remonte en 500 au corps vide et l'admin ne
 * voit qu'un code : le composeur affiche `error`, autant lui donner la cause.
 */
function failed(context: string, err: unknown) {
  console.error(`[quote-pdf] ${context}:`, err)
  const detail = err instanceof Error ? err.message : 'cause inconnue'
  return NextResponse.json({ error: `Devis non généré — ${detail}` }, { status: 500 })
}

function pdfResponse(bytes: Uint8Array, filename: string) {
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      // `inline` : le devis s'ouvre dans l'onglet, l'admin le lit sans passer
      // par le dossier Téléchargements.
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { orderId } = await params
  const order = await loadOrder(orderId)
  if (!order) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

  if (!order.quote_number) {
    return NextResponse.json({ error: 'Aucun devis envoyé pour cette demande.' }, { status: 404 })
  }

  try {
    const pdf = await buildQuotePdf({
      order,
      quoteNumber: order.quote_number,
      object: fallbackQuoteObject(order),
      items: fallbackQuoteItems(order, order.total_amount ?? 0),
      issuedAt: order.quote_issued_at ? new Date(order.quote_issued_at) : undefined,
      depositAmount: order.deposit_amount,
    })
    return pdfResponse(pdf, quoteFileName(order.quote_number, order.name))
  } catch (err) {
    return failed('rendu du devis envoyé', err)
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { orderId } = await params
  const order = await loadOrder(orderId)
  if (!order) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

  let body: unknown
  try { body = await req.json() } catch { body = {} }

  const parsed = previewSchema.safeParse(body ?? {})
  if (!parsed.success) {
    return NextResponse.json({ error: 'Brouillon invalide', details: parsed.error.flatten() }, { status: 422 })
  }

  const items = parsed.data.quote_items ?? fallbackQuoteItems(order, order.total_amount ?? 0)
  const object = parsed.data.quote_object?.trim() || fallbackQuoteObject(order)

  try {
    // Aperçu avant envoi : on montre le numéro qui sera réellement attribué,
    // sans le réserver — un brouillon abandonné ne doit pas trouer la séquence.
    const quoteNumber = order.quote_number ?? await nextQuoteNumber()

    const pdf = await buildQuotePdf({
      order,
      quoteNumber,
      object,
      items,
      issuedAt: order.quote_issued_at ? new Date(order.quote_issued_at) : undefined,
      depositAmount: parsed.data.deposit_amount ?? order.deposit_amount,
    })

    return pdfResponse(pdf, quoteFileName(quoteNumber, order.name))
  } catch (err) {
    return failed('aperçu du devis', err)
  }
}
