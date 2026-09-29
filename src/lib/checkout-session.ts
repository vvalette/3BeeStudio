import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'

/**
 * Ferme le lien de paiement envoyé précédemment, avant d'en émettre un autre
 * (ou de basculer en virement).
 *
 * Sans ça, l'ancien lien reste payable jusqu'à son expiration (24 h par défaut
 * chez Stripe) : un client qui retrouve le premier email règle le même montant
 * une seconde fois.
 *
 * - `closed` : rien d'ouvert (pas de session, déjà expirée, ou inconnue du
 *   compte — un id de test lu en live, par exemple).
 * - `paid` : la session a déjà été réglée, le webhook n'est simplement pas
 *   encore passé. L'appelant doit refuser, pas réémettre.
 *
 * Toute autre erreur Stripe remonte : mieux vaut un envoi refusé qu'un ancien
 * lien laissé ouvert à côté du nouveau.
 */
export async function closePreviousCheckout(sessionId: string | null): Promise<'closed' | 'paid'> {
  if (!sessionId) return 'closed'

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId)
  } catch (err) {
    if (err instanceof Stripe.errors.StripeInvalidRequestError && err.code === 'resource_missing') return 'closed'
    throw err
  }

  if (session.status === 'complete') return 'paid'
  if (session.status === 'open') await stripe.checkout.sessions.expire(sessionId)
  return 'closed'
}
