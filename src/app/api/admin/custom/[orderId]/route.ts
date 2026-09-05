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

/** Colonne NOT NULL : la vider casserait la fiche, l'email et le devis. */
const required = (max: number) => z.string().trim().min(1).max(max)
/** Colonne nullable : le champ laissé vide se range en `null`, pas en `''`. */
const erasable = (max: number) => z.string().trim().max(max).transform((v) => v || null).nullable()

const patchSchema = z.object({
  status:          z.enum(CUSTOM_STATUSES as [CustomOrderStatus, ...CustomOrderStatus[]]).optional(),
  admin_notes:     z.string().optional(),
  tracking_number: z.string().optional(),
  tracking_url:    z.string().optional(),
  deposit_amount:  z.number().int().positive().optional(),
  total_amount:    z.number().int().positive().optional(),

  // Fiche client et projet, corrigeables après coup : une demande arrivée par
  // le formulaire ou par DM se complète au fil de l'échange (adresse dictée au
  // téléphone, email mal tapé, projet précisé). Sans ça, la seule issue était
  // de recréer la demande, en perdant devis et encaissements.
  name:            required(120).optional(),
  company:         erasable(120).optional(),
  email:           z.string().trim().email('Email invalide').max(200).optional(),
  // NOT NULL en base mais facultatif pour le client : vide reste vide.
  phone:           z.string().trim().max(40).optional(),
  project_type:    required(60).optional(),
  description:     required(5000).optional(),
  budget_range:    erasable(80).optional(),
  deadline:        erasable(80).optional(),

  shipping_name:        erasable(120).optional(),
  shipping_address:     erasable(300).optional(),
  shipping_postal_code: erasable(20).optional(),
  shipping_city:        erasable(120).optional(),

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
