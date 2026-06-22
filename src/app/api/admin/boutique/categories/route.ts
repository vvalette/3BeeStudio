import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import { z } from 'zod'

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

const createSchema = z.object({
  label:      z.string().min(1).max(80),
  label_en:   z.string().max(80).optional(),
  sort_order: z.number().int().min(0).optional(),
})

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('shop_categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })

  const { label, label_en, sort_order } = parsed.data
  const key = slugify(label)

  if (!key)
    return NextResponse.json({ error: 'Libellé invalide — impossible de générer une clé' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('shop_categories')
    .insert({ key, label, label_en: label_en ?? null, sort_order: sort_order ?? 0 })
    .select()
    .single()

  if (error) {
    if (error.code === '23505')
      return NextResponse.json({ error: `Une catégorie avec la clé « ${key} » existe déjà` }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
