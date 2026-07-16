import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  body: z.string().min(1),
  avatar_gradient: z.string().default('linear-gradient(135deg, #F59E0B, #7C2D12)'),
  display_order: z.number().int().default(0),
  visible: z.boolean().default(true),
  source: z.enum(['manual', 'google']).default('manual'),
  rating: z.number().int().min(1).max(5).default(5),
  avatar_url: z.string().url().nullable().optional(),
  source_url: z.string().url().nullable().optional(),
  country: z.string().min(1).default('France'),
})

export async function POST(req: Request) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('testimonials')
    .insert(parsed.data)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
