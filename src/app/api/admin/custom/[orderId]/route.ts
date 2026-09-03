import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import { z } from 'zod'
import { quoteItemSchema } from '@/lib/documents/input'
import { isQuoteNumberConflict } from '@/lib/documents/number'
import type { CustomOrderStatus } from '@/types/custom-order'

const CUSTOM_STATUSES: CustomOrderStatus[] = [
  'pending_quote', 'quote_sent', 'deposit_paid', 'in_production', 'shipped', 'delivered', 'cancelled',
]

const patchSchema = z.object({
  status:          z.enum(CUSTOM_STATUSES as [CustomOrderStatus, ...CustomOrderStatus[]]).optional(),
  admin_notes:     z.string().optional(),
  tracking_number: z.string().optional(),
  tracking_url:    z.string().optional(),
  deposit_amount:  z.number().int().positive().optional(),
  total_amount:    z.number().int().positive().optional(),
  // Champs du devis, enregistrables sans envoi : un devis fabriqué et transmis
  // ailleurs (DM, email direct) doit pouvoir entrer dans l'app avec ses
  // montants, sans qu'un email parte une seconde fois au client.
  quote_object:    z.string().trim().max(300).nullable().optional(),
  quote_number:    z.string().trim().min(3).max(40).nullable().optional(),
  quote_items:     z.array(quoteItemSchema).max(40).nullable().optional(),
})

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const { orderId } = await params
  const { error } = await supabaseAdmin.from('custom_orders').delete().eq('id', orderId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

/**
 * Mise à jour partielle d'une demande. Ne déclenche jamais d'envoi : le devis
 * s'enregistre ici (montants, objet, numéro) sans email ni lien de paiement,
 * l'envoi restant l'affaire de POST /api/custom/[orderId]/quote.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { orderId } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('custom_orders')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single()

  if (error) {
    // Le numéro de devis est unique en base : le corriger en douce ferait
    // diverger la fiche du document déjà transmis au client.
    if (isQuoteNumberConflict(error)) {
      return NextResponse.json(
        { error: `Le numéro ${parsed.data.quote_number} est déjà utilisé par un autre devis.` },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
