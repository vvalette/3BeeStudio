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
  custom_field_values?: Record<string, string>
}
