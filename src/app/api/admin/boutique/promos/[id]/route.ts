import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import { normalizeCode } from '@/lib/promo'
import { z } from 'zod'
import type { TablesUpdate } from '@/types/database'

const patchSchema = z.object({
  code:           z.string().min(2).max(40).optional(),
  type:           z.enum(['percent', 'amount', 'free_shipping']).optional(),
  value:          z.number().int().min(0).optional(),
  active:         z.boolean().optional(),
  starts_at:      z.string().datetime().nullable().optional(),
  ends_at:        z.string().datetime().nullable().optional(),
  max_uses:       z.number().int().min(1).nullable().optional(),
  once_per_email: z.boolean().optional(),
  min_subtotal:   z.number().int().min(0).optional(),
  applies_to:     z.enum(['all', 'physical', 'digital']).optional(),
  note:           z.string().max(300).nullable().optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  // Typé par le schéma DB : une colonne mal nommée serait refusée à la compilation.
  const d = parsed.data
  const update: TablesUpdate<'promo_codes'> = { ...d }
  if (d.code) update.code = normalizeCode(d.code)
  if (d.type === 'free_shipping') update.value = 0

  const { data, error } = await supabaseAdmin
    .from('promo_codes')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    const message = error.code === '23505' ? 'Ce code existe déjà' : error.message
    return NextResponse.json({ error: message }, { status: 409 })
  }

  return NextResponse.json({ promo: data })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params

  // Un code déjà utilisé n'est pas supprimé : les lignes de `promo_code_uses`
  // partiraient en cascade et l'historique des commandes deviendrait inexplicable.
  // Il est désactivé — même effet côté client, sans perte de traçabilité.
  const { count } = await supabaseAdmin
    .from('promo_code_uses')
    .select('id', { count: 'exact', head: true })
    .eq('promo_code_id', id)

  if ((count ?? 0) > 0) {
    const { error } = await supabaseAdmin.from('promo_codes').update({ active: false }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ deactivated: true, uses: count })
  }

  const { error } = await supabaseAdmin.from('promo_codes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
