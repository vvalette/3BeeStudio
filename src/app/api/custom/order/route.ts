import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { sendCustomOrderConfirmation, sendCustomOrderAdminNotification } from '@/lib/resend'
import type { CustomOrder } from '@/types/custom-order'

const schema = z.object({
  // Projet
  project_type: z.string().min(1),
  description:  z.string().min(20, 'Décrivez votre projet en au moins 20 caractères').max(2000),
  reference_file_url: z.string().url().optional().nullable(),

  // Contact
  name:    z.string().min(2, 'Nom requis'),
  company: z.string().optional(),
  email:   z.string().email('Email invalide'),
  phone:   z.string().min(8, 'Téléphone requis'),

  // Adresse
  shipping_name:        z.string().min(2, 'Nom du destinataire requis'),
  shipping_address:     z.string().min(5, 'Adresse requise'),
  shipping_city:        z.string().min(2, 'Ville requise'),
  shipping_postal_code: z.string().min(4, 'Code postal requis'),
})

// Rate limiting simple en mémoire (remplacer par Redis en prod si nécessaire)
const rateLimitMap = new Map<string, { count: number; reset: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || entry.reset < now) {
    rateLimitMap.set(ip, { count: 1, reset: now + 10 * 60 * 1000 })
    return false
  }
  if (entry.count >= 5) return true
  entry.count++
  return false
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Trop de demandes. Réessayez dans quelques minutes.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 422 })
  }

  const data = parsed.data

  // Création en base
  const { data: order, error: dbError } = await supabaseAdmin
    .from('custom_orders')
    .insert({
      project_type:         data.project_type,
      description:          data.description,
      reference_file_url:   data.reference_file_url ?? null,
      name:                 data.name,
      company:              data.company ?? null,
      email:                data.email,
      phone:                data.phone,
      shipping_name:        data.shipping_name,
      shipping_address:     data.shipping_address,
      shipping_city:        data.shipping_city,
      shipping_postal_code: data.shipping_postal_code,
      status:               'pending_quote',
    })
    .select()
    .single()

  if (dbError || !order) {
    console.error('[mesure/order] Erreur Supabase:', dbError)
    return NextResponse.json({ error: 'Erreur lors de la création de la demande' }, { status: 500 })
  }

  // Emails en parallèle, attendus avant de répondre : sans `await`, la fonction
  // Vercel peut être gelée dès la réponse renvoyée et les envois Resend ne
  // partent jamais (cas constaté sur la demande du 15/08). Un échec d'envoi
  // reste non bloquant : la demande est déjà enregistrée en base.
  await Promise.all([
    sendCustomOrderConfirmation(order as CustomOrder).catch((err) =>
      console.error('[mesure/order] Email client non bloquant:', err),
    ),
    sendCustomOrderAdminNotification(order as CustomOrder).catch((err) =>
      console.error('[mesure/order] Notif admin non bloquante:', err),
    ),
  ])

  return NextResponse.json({ order_id: order.id }, { status: 201 })
}
