import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { AbandonedCart } from '@/types/abandoned-cart'

/**
 * Désinscription des relances de panier, depuis le lien de l'email.
 *
 * En GET, et sans confirmation : un lien de retrait doit marcher d'un seul clic,
 * y compris quand c'est le client mail qui le pré-charge. Le refus est enregistré
 * par email et vaut pour les paniers suivants, pas seulement pour celui en cours.
 *
 * Se désinscrire des relances ne touche pas à la newsletter : ce sont deux
 * consentements distincts, et les mélanger ferait perdre au client des envois
 * qu'il n'a pas refusés.
 */
export async function GET(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'
  const token  = new URL(req.url).searchParams.get('token')

  const back = (locale: string) =>
    NextResponse.redirect(`${appUrl}${locale === 'en' ? '/en' : ''}/boutique?relance=stop`, 303)

  if (!token) return back('fr')

  const { data } = await supabaseAdmin
    .from('abandoned_carts')
    .select('email, locale')
    .eq('token', token)
    .maybeSingle()

  // Jeton inconnu (panier purgé, lien tronqué) : on renvoie quand même sur la
  // page de confirmation. Répondre 404 laisserait croire au client que son refus
  // n'a pas été pris en compte, alors qu'il n'y a de toute façon plus rien à relancer.
  if (!data) return back('fr')

  const cart = data as unknown as Pick<AbandonedCart, 'email' | 'locale'>

  const { error } = await supabaseAdmin
    .from('abandoned_cart_optouts')
    .upsert({ email: cart.email }, { onConflict: 'email' })

  if (error) console.error('[cart/opt-out] enregistrement échoué:', error.message)

  // Les paniers déjà en file pour cet email sortent tout de suite, sans attendre
  // le filtre du cron : un refus doit prendre effet immédiatement.
  await supabaseAdmin
    .from('abandoned_carts')
    .update({ reminded_at: new Date().toISOString() })
    .eq('email', cart.email)
    .is('reminded_at', null)

  console.info('[cart/opt-out]', JSON.stringify({ event: 'opted_out' }))

  return back(cart.locale)
}
