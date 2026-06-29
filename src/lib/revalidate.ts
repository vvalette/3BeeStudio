import { revalidatePath } from 'next/cache'

/**
 * Revalide les pages publiques affectées par un changement produit boutique.
 *
 * Combiné à un ISR long (`revalidate = 3600`), ça permet de servir les pages
 * depuis le cache CDN quasi en permanence (donc rapides, sans cold start de
 * régénération), tout en les rafraîchissant immédiatement quand l'admin
 * crée / modifie / supprime un produit.
 *
 * Les chemins sont déclinés FR (`/…`) + EN (`/en/…`) car next-intl utilise
 * `localePrefix: 'as-needed'`.
 */
export function revalidateShop(...slugs: (string | null | undefined)[]) {
  // Home (grille produits featured)
  revalidatePath('/')
  revalidatePath('/en')
  // Catalogue boutique
  revalidatePath('/boutique')
  revalidatePath('/en/boutique')
  // Fiches produit concernées (slug courant + ancien slug si renommé)
  for (const slug of slugs) {
    if (!slug) continue
    revalidatePath(`/boutique/${slug}`)
    revalidatePath(`/en/boutique/${slug}`)
  }
}
