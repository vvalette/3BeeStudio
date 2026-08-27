import type { SelectedColor } from './shop-product'

export interface CartItem {
  product_id: string
  name: string
  slug: string
  price: number               // centimes, prix effectif (promo si applicable)
  original_price: number | null // prix de base avant promo, null si pas de promo
  image: string | null
  quantity: number
  max_stock: number | null    // null = illimité
  /**
   * true = fichier à télécharger : exclu du calcul des frais de port et du seuil
   * de gratuité, et n'exige aucune adresse de livraison.
   * Optionnel : les paniers déjà en localStorage n'ont pas ce champ (défaut physique).
   */
  is_digital?: boolean
  /**
   * Coloris choisi sur la fiche produit. Deux coloris d'un même produit = deux
   * lignes de panier (cf. `cartLineKey`), chacune avec sa quantité.
   * `hex` n'est là que pour la pastille affichée dans le panier ; le serveur
   * revalide `key` contre la palette du produit au checkout.
   */
  color?: SelectedColor & { hex?: string }
  custom_field_values?: Record<string, string>
}
