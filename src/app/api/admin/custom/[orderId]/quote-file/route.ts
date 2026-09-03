/**
 * Devis PDF importé, côté admin.
 *
 *  - POST   : téléverse un devis fabriqué hors de l'app et l'attache à la demande.
 *  - DELETE : le retire — la demande repasse au devis composé dans l'app.
 *
 * Le fichier n'est pas envoyé au client ici : il attend dans le bucket privé
 * jusqu'à ce que l'admin déclenche l'envoi (POST /api/custom/[orderId]/quote).
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import {
  MAX_QUOTE_PDF_SIZE,
  removeQuotePdf,
  safeQuoteFileName,
  uploadQuotePdf,
} from '@/lib/documents/quote-file'

async function currentPath(orderId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('custom_orders')
    .select('quote_pdf_path')
    .eq('id', orderId)
    .single()
  return data?.quote_pdf_path ?? null
}

/** Le type MIME vient du navigateur : on vérifie aussi la signature du fichier. */
async function isPdf(file: File): Promise<boolean> {
  const head = Buffer.from(await file.slice(0, 5).arrayBuffer()).toString('latin1')
  return head === '%PDF-'
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { orderId } = await params

  const formData = await req.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 })
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'Fichier vide' }, { status: 400 })
  }
  if (file.size > MAX_QUOTE_PDF_SIZE) {
    return NextResponse.json({ error: 'Fichier trop lourd (max 10 Mo)' }, { status: 400 })
  }
  if (!(await isPdf(file))) {
    return NextResponse.json({ error: 'Seuls les PDF sont acceptés' }, { status: 400 })
  }

  const previous = await currentPath(orderId)

  let path: string
  try {
    path = await uploadQuotePdf(orderId, file)
  } catch (err) {
    console.error('[quote-file] téléversement:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Téléversement impossible' },
      { status: 500 },
    )
  }

  const quote_pdf_name = safeQuoteFileName(file.name || 'Devis.pdf')

  const { error } = await supabaseAdmin
    .from('custom_orders')
    .update({ quote_pdf_path: path, quote_pdf_name, updated_at: new Date().toISOString() })
    .eq('id', orderId)

  if (error) {
    // La ligne n'a pas bougé : le fichier tout juste posé n'a plus de raison d'être.
    await removeQuotePdf(path)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Remplacement : l'ancien devis n'est plus référencé nulle part.
  if (previous && previous !== path) await removeQuotePdf(previous)

  return NextResponse.json({ quote_pdf_path: path, quote_pdf_name })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { orderId } = await params
  const path = await currentPath(orderId)

  const { error } = await supabaseAdmin
    .from('custom_orders')
    .update({ quote_pdf_path: null, quote_pdf_name: null, updated_at: new Date().toISOString() })
    .eq('id', orderId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await removeQuotePdf(path)
  return NextResponse.json({ ok: true })
}
