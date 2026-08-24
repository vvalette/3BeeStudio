import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import { normalizeCode } from '@/lib/promo'
import { z } from 'zod'

/**
 * Gestion des codes promo (admin).
 *
 * `uses` n'est jamais écrit par ces routes : le compteur appartient à la RPC
 * `redeem_promo_code`, qui seule peut l'incrémenter sans course. L'exposer ici
 * permettrait de le désynchroniser de `promo_code_uses`.
 */

const baseSchema = z.object({
  code:           z.string().min(2).max(40),
  type:           z.enum(['percent', 'amount', 'free_shipping']),
  value:          z.number().int().min(0).default(0),
  active:         z.boolean().default(true),
  starts_at:      z.string().datetime().nullable().optional(),
  ends_at:        z.string().datetime().nullable().optional(),
  max_uses:       z.number().int().min(1).nullable().optional(),
  once_per_email: z.boolean().default(false),
  min_subtotal:   z.number().int().min(0).default(0),
  applies_to:     z.enum(['all', 'physical', 'digital']).default('all'),
  note:           z.string().max(300).nullable().optional(),
}).superRefine((d, ctx) => {
  // Mêmes bornes que la contrainte SQL : refusées ici avec un message lisible
  // plutôt qu'en erreur Postgres brute remontée à l'écran.
  if (d.type === 'percent' && (d.value < 1 || d.value > 100))
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'Le pourcentage doit être entre 1 et 100' })
  if (d.type === 'amount' && d.value <= 0)
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'Le montant doit être supérieur à 0' })
  if (d.starts_at && d.ends_at && new Date(d.ends_at) <= new Date(d.starts_at))
    ctx.addIssue({ code: 'custom', path: ['ends_at'], message: 'La fin doit être après le début' })
})

export async function GET() {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ promos: data ?? [] })
}

export async function POST(req: Request) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const parsed = baseSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Données invalides' },
      { status: 400 },
    )

  const d = parsed.data
  const { data, error } = await supabaseAdmin
    .from('promo_codes')
    .insert({
      code:           normalizeCode(d.code),
      type:           d.type,
      value:          d.type === 'free_shipping' ? 0 : d.value,
      active:         d.active,
      starts_at:      d.starts_at ?? null,
      ends_at:        d.ends_at ?? null,
      max_uses:       d.max_uses ?? null,
      once_per_email: d.once_per_email,
      min_subtotal:   d.min_subtotal,
      applies_to:     d.applies_to,
      note:           d.note ?? null,
    })
    .select()
    .single()

  if (error) {
    // 23505 = violation d'unicité : le code existe déjà.
    const message = error.code === '23505'
      ? `Le code « ${normalizeCode(d.code)} » existe déjà`
      : error.message
    return NextResponse.json({ error: message }, { status: 409 })
  }

  return NextResponse.json({ promo: data })
}
