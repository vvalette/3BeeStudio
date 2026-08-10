import { NextResponse } from 'next/server'
import { z } from 'zod'
import { searchParcelPoints } from '@/lib/boxtal'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

/**
 * Points relais autour d'une adresse, pour le sélecteur du checkout.
 * Proxy côté serveur : les identifiants Boxtal ne doivent jamais partir au navigateur.
 */
const querySchema = z.object({
  postalCode: z.string().trim().regex(/^\d{5}$/, 'Code postal invalide'),
  city:       z.string().trim().max(80).optional(),
  street:     z.string().trim().max(120).optional(),
})

export async function GET(req: Request) {
  // Endpoint public non authentifié qui tape une API tierce facturée → borné.
  const ip = getClientIp(req)
  const { ok } = await rateLimit(`parcel-points:${ip}`, 30, 60 * 1000)
  if (!ok) {
    return NextResponse.json({ error: 'Trop de recherches, réessayez dans une minute' }, { status: 429 })
  }

  const url = new URL(req.url)
  const parsed = querySchema.safeParse({
    postalCode: url.searchParams.get('postalCode') ?? '',
    city:       url.searchParams.get('city')   || undefined,
    street:     url.searchParams.get('street') || undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const points = await searchParcelPoints(parsed.data)
    // 12 points suffisent pour choisir : au-delà la liste devient illisible sur mobile.
    return NextResponse.json({ points: points.slice(0, 12) })
  } catch (err) {
    console.error('[parcel-points] Boxtal:', err)
    return NextResponse.json({ error: 'Recherche des points relais indisponible' }, { status: 502 })
  }
}
