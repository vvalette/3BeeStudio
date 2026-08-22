import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import { sendCustomOrderConfirmation } from '@/lib/resend'
import type { CustomOrder } from '@/types/custom-order'

/**
 * Création manuelle d'une demande sur-mesure depuis l'admin.
 *
 * Toutes les demandes n'arrivent pas par le formulaire public : beaucoup se
 * négocient en DM Instagram. Cette route recrée la même ligne `custom_orders`
 * pour que ces demandes rejoignent le flux normal (devis, acompte Stripe, page
 * de suivi client) au lieu de vivre dans une conversation.
 *
 * Différences volontaires avec `/api/custom/order` (formulaire public) :
 *  - téléphone et adresse facultatifs — souvent inconnus au moment du DM ;
 *  - pas de notification interne (l'admin est en train de la saisir) ;
 *  - l'accusé de réception client n'est envoyé que si l'admin le demande.
 */

/** Champ texte facultatif : '' et espaces seuls valent « non renseigné » (null en base). */
const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))

const schema = z.object({
  // Projet
  project_type: z.string({ required_error: 'Type de projet requis' }).min(1, 'Type de projet requis'),
  description:  z.string({ required_error: 'Description requise' }).trim().min(5, 'Description requise').max(2000),
  budget_range: optionalText,
  deadline:     optionalText,

  // Contact — l'email reste obligatoire : c'est lui qui porte le devis et le
  // lien de paiement une fois la demande transformée.
  name:    z.string({ required_error: 'Nom requis' }).trim().min(2, 'Nom requis'),
  company: optionalText,
  email:   z.string({ required_error: 'Email requis' }).trim().email('Email invalide'),
  phone:   z.string().trim().max(30).optional(),

  // Adresse — facultative, complétée plus tard au moment de l'expédition
  shipping_name:        optionalText,
  shipping_address:     optionalText,
  shipping_city:        optionalText,
  shipping_postal_code: optionalText,

  admin_notes: optionalText,

  /** Envoie l'accusé de réception (avec le lien de suivi) au client. */
  notify_client: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? 'Données invalides'
    return NextResponse.json({ error: first, details: parsed.error.flatten() }, { status: 422 })
  }

  const { notify_client, phone, ...data } = parsed.data

  const { data: order, error: dbError } = await supabaseAdmin
    .from('custom_orders')
    .insert({
      ...data,
      // `phone` est NOT NULL en base : une chaîne vide encode « pas de numéro »
      // (l'affichage admin la traite comme absente).
      phone:  phone ?? '',
      status: 'pending_quote',
    })
    .select()
    .single()

  if (dbError || !order) {
    console.error('[admin/custom] Erreur Supabase:', dbError)
    return NextResponse.json({ error: dbError?.message ?? 'Erreur lors de la création' }, { status: 500 })
  }

  // Attendu avant de répondre : un envoi détaché serait perdu si la fonction
  // Vercel est gelée dès la réponse (cf. /api/custom/order).
  let emailFailed = false
  if (notify_client) {
    try {
      await sendCustomOrderConfirmation(order as CustomOrder)
    } catch (err) {
      emailFailed = true
      console.error('[admin/custom] Accusé de réception non envoyé:', err)
    }
  }

  return NextResponse.json({ order, email_failed: emailFailed }, { status: 201 })
}
