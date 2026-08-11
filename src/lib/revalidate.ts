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
  // Chaque chemin est décliné avec le préfixe interne `/fr` : le préfixe est
  // masqué dans l'URL publique, mais les entrées de cache ISR vivent sous
  // /[locale]/… — on couvre les deux formes pour être sûr d'invalider.
  // Home (grille produits featured)
  revalidatePath('/')
  revalidatePath('/fr')
  revalidatePath('/en')
  // Catalogue boutique
  revalidatePath('/boutique')
  revalidatePath('/fr/boutique')
  revalidatePath('/en/boutique')
  // Catalogue des fichiers 3D : page distincte de /boutique, mais alimentée par
  // la même table — sans ça, publier ou retirer un produit numérique restait
  // invisible jusqu'à une heure (ISR long).
  revalidatePath('/designs')
  revalidatePath('/fr/designs')
  revalidatePath('/en/designs')
  // Fiches produit concernées (slug courant + ancien slug si renommé)
  for (const slug of slugs) {
    if (!slug) continue
    revalidatePath(`/boutique/${slug}`)
    revalidatePath(`/fr/boutique/${slug}`)
    revalidatePath(`/en/boutique/${slug}`)
  }
}
