import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// v•••@domaine.fr — évite d'exposer l'email complet à quiconque possède l'UUID de commande.
function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  if (!domain) return '•••'
  return `${user.slice(0, 1)}•••@${domain}`
}

export async function GET(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params

  const { data, error } = await supabaseAdmin
    .from('shop_orders')
    .select('id, created_at, status, items, subtotal, shipping, total_amount, name, email, shipping_name, shipping_city, tracking_number, tracking_url')
    .eq('id', orderId)
    .single()

  if (error || !data)
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

  return NextResponse.json({ ...data, email: maskEmail(data.email) })
}
