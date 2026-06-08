import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  return token === process.env.ADMIN_PASSWORD
}

export async function GET() {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 })
  }

  return NextResponse.json(data)
}
