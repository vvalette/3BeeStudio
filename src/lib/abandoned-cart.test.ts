import { describe, it, expect, vi } from 'vitest'
import { render } from 'react-email'

// Le module tire `supabaseAdmin`, qui exige les variables d'environnement dès
// l'import. Seules les fabriques d'URL sont testées ici, pas l'instantané.
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: {}, supabase: {} }))

import { recoveryUrl, optOutUrl } from './abandoned-cart'
import AbandonedCart from '@/emails/AbandonedCart'
import type { ShopOrderItem } from '@/types/shop-order'

const appUrl = 'https://3beestudio.fr'
const token  = 'aBc-123_XyZ'

describe('liens de la relance', () => {
  it('renvoie vers le checkout, jamais vers l\'ancienne session Stripe', () => {
    // La session expire en 30 min, la relance part au plus tôt à 1 h : son lien
    // doit rouvrir un checkout neuf, reconstruit depuis l'instantané.
    expect(recoveryUrl(appUrl, token, 'fr')).toBe(
      'https://3beestudio.fr/boutique/commande?panier=aBc-123_XyZ',
    )
  })

  it('préfixe la langue du client', () => {
    expect(recoveryUrl(appUrl, token, 'en')).toContain('/en/boutique/commande')
  })

  it('encode le jeton', () => {
    // base64url ne produit pas de caractère à encoder, mais le lien ne doit pas
    // dépendre de cette propriété du générateur.
    expect(recoveryUrl(appUrl, 'a+b/c=', 'fr')).toContain('panier=a%2Bb%2Fc%3D')
  })

  it('expose un lien de désinscription indépendant de la langue', () => {
    expect(optOutUrl(appUrl, token)).toBe(
      'https://3beestudio.fr/api/boutique/cart/opt-out?token=aBc-123_XyZ',
    )
  })
})

describe('email de relance', () => {
  const items: ShopOrderItem[] = [
    { product_id: 'p1', product_name: 'Vase Hexagone', quantity: 2, unit_price: 2400 },
  ]

  const html = (locale?: string) =>
    render(AbandonedCart({
      name: 'Jean Dupont',
      items,
      subtotal: 4800,
      recoveryUrl: recoveryUrl(appUrl, token, locale ?? 'fr'),
      optOutUrl:   optOutUrl(appUrl, token),
      locale,
    }))

  it('porte le lien de reprise et le lien de désinscription', async () => {
    const out = await html()
    expect(out).toContain('/boutique/commande?panier=')
    // Une relance n'est pas un email transactionnel : sans ce lien, elle ne
    // devrait pas partir du tout.
    expect(out).toContain('/api/boutique/cart/opt-out?token=')
    expect(out).toContain('Ne plus recevoir ces rappels')
  })

  it('affiche le panier et son sous-total', async () => {
    const out = await html()
    expect(out).toContain('Vase Hexagone')
    expect(out).toContain('48,00')
  })

  it('rassure sur l\'absence de débit', async () => {
    expect(await html()).toContain('Rien n&#x27;a été débité.')
  })

  it('n\'utilise pas de tiret cadratin dans la version française', async () => {
    // Règle de ponctuation FR du projet : pas de — dans la copie vue par le client.
    const out = await html()
    const body = out.replace(/<[^>]+>/g, ' ')
    expect(body).not.toContain('—')
  })

  it('bascule en anglais sur une commande anglophone', async () => {
    const out = await html('en')
    expect(out).toContain('Complete my order')
    expect(out).toContain('Stop these reminders')
  })
})
