import { describe, it, expect } from 'vitest'
import { render } from 'react-email'
import { mkdirSync, writeFileSync } from 'fs'
import OrderConfirmation from './OrderConfirmation'
import NfcOrderAdmin from './NfcOrderAdmin'
import CustomOrderConfirmation from './CustomOrderConfirmation'
import CustomOrderAdmin from './CustomOrderAdmin'
import CustomQuote from './CustomQuote'
import CustomBalance from './CustomBalance'
import ShopOrderConfirmation from './ShopOrderConfirmation'
import AbandonedCart from './AbandonedCart'
import ShopOrderAdmin from './ShopOrderAdmin'
import ShipmentNotification from './ShipmentNotification'
import OrderDelivered from './OrderDelivered'
import NewsletterWelcome from './NewsletterWelcome'
import ContactMessage from './ContactMessage'
import type { CustomOrder, QuoteLineItem } from '@/types/custom-order'
import type { Order } from '@/types/order'
import type { ShopOrder } from '@/types/shop-order'

const appUrl = 'https://3beestudio.fr'

const customOrder = {
  id: '8c063e3e-76d6-4f48-a9e0-d397ac454b20',
  created_at: '2026-08-15T18:58:49Z',
  name: 'Jean Dupont', company: null, email: 'jean@exemple.fr', phone: '0612345678',
  project_type: 'deco',
  description: 'Dix caches en H pour poteaux de clôture, en PETG noir.\nDimensions du poteau : 6 × 4 cm.',
  reference_file_url: 'https://example.com/ref.jpg',
  shipping_name: 'Jean Dupont', shipping_address: '12 rue des Lilas',
  shipping_city: 'Paris', shipping_postal_code: '75001',
  deposit_amount: 1750, total_amount: 3500,
} as unknown as CustomOrder

const nfcOrder = {
  id: 'af5b9894-1111-2222-3333-444455556666',
  created_at: '2026-08-15T10:00:00Z',
  company: 'Café des Sports', email: 'contact@exemple.fr', phone: '0612345678',
  sector: 'Restauration', quantity: 50, unit_price: 690, total_amount: 34500,
  nfc_url: 'https://instagram.com/exemple', logo_url: 'https://example.com/logo.svg',
  shipping_name: 'Jean Dupont', shipping_address: '12 rue des Lilas', shipping_address2: null,
  shipping_city: 'Paris', shipping_postal_code: '75001',
} as unknown as Order

const shopOrder = {
  id: 'ca40306f-aaaa-bbbb-cccc-ddddeeeeffff',
  created_at: '2026-08-20T14:09:00Z',
  name: 'Jean Dupont', email: 'jean@exemple.fr', phone: '0612345678',
  items: [
    { product_id: 'p1', product_name: 'Vase Hexagone', quantity: 2, unit_price: 2400, custom_field_values: [{ key: 'c', label: 'Coloris', value: 'Ambre' }] },
    { product_id: 'p2', product_name: 'Support casque', quantity: 1, unit_price: 3200 },
  ],
  subtotal: 8000, discount_amount: 800, shipping: 490, total_amount: 7690,
  delivery_mode: 'delivery', has_digital: false, has_physical: true,
  shipping_name: 'Jean Dupont', shipping_address: '12 rue des Lilas', shipping_address2: null,
  shipping_city: 'Paris', shipping_postal_code: '75001', shipping_country: 'FR',
  locale: 'fr',
} as unknown as ShopOrder

const items: QuoteLineItem[] = [
  { label: 'Cache en H pour poteau de clôture', detail: 'Impression 3D FDM, filament PETG (résistant UV)\nColoris au choix', quantity: 10, unit_price: 350 },
]

const templates: Array<[string, Promise<string>]> = [
  ['nfc-confirmation', render(OrderConfirmation({ company: 'Café des Sports', email: 'contact@exemple.fr', quantity: 50, destination: 'instagram.com/exemple', totalAmount: 34500, orderId: nfcOrder.id, appUrl }))],
  ['nfc-admin', render(NfcOrderAdmin({ order: nfcOrder, appUrl }))],
  ['custom-confirmation', render(CustomOrderConfirmation({ order: customOrder, appUrl }))],
  ['custom-admin', render(CustomOrderAdmin({ order: customOrder, appUrl }))],
  ['custom-quote', render(CustomQuote({ order: customOrder, quoteNumber: 'DEV-2026-002', object: 'fabrication de caches en H — impression 3D PETG', items, total: 3500, deposit: 1750, validUntil: new Date('2026-09-21'), appUrl, paymentUrl: 'https://checkout.stripe.com/c/pay/cs_1' }))],
  ['custom-balance', render(CustomBalance({ order: customOrder, amount: 1750, appUrl, paymentUrl: 'https://checkout.stripe.com/c/pay/cs_2' }))],
  ['shop-confirmation', render(ShopOrderConfirmation({ order: shopOrder, appUrl }))],
  ['shop-confirmation-en', render(ShopOrderConfirmation({ order: shopOrder, appUrl, locale: 'en' }))],
  ['shop-admin', render(ShopOrderAdmin({ order: shopOrder, appUrl }))],
  ['abandoned-cart', render(AbandonedCart({ name: 'Jean Dupont', items: shopOrder.items, subtotal: 8000, recoveryUrl: `${appUrl}/boutique/commande?panier=tok`, optOutUrl: `${appUrl}/api/boutique/cart/opt-out?token=tok` }))],
  ['abandoned-cart-en', render(AbandonedCart({ name: 'Jane Doe', items: shopOrder.items, subtotal: 8000, recoveryUrl: `${appUrl}/en/boutique/commande?panier=tok`, optOutUrl: `${appUrl}/api/boutique/cart/opt-out?token=tok`, locale: 'en' }))],
  ['shipment', render(ShipmentNotification({ recipientName: 'Jean Dupont', orderRef: 'CA40306F', trackingUrl: `${appUrl}/boutique/suivi/x`, carrierTrackingNumber: '6A12345678901', carrierTrackingUrl: 'https://laposte.fr/suivi', deliveryMode: 'delivery', address: { name: 'Jean Dupont', line1: '12 rue des Lilas', line2: null, postalCode: '75001', city: 'Paris' } }))],
  ['delivered', render(OrderDelivered({ recipientName: 'Jean Dupont', orderRef: 'CA40306F', trackingUrl: `${appUrl}/boutique/suivi/x`, what: 'votre commande' }))],
  ['delivered-en', render(OrderDelivered({ recipientName: 'Jean Dupont', orderRef: 'CA40306F', trackingUrl: `${appUrl}/en/boutique/suivi/x`, locale: 'en' }))],
  ['newsletter', render(NewsletterWelcome({ appUrl }))],
  ['contact', render(ContactMessage({ name: 'Jean Dupont', email: 'jean@exemple.fr', subject: 'Question sur un projet', message: 'Bonjour,\nSeriez-vous en mesure d’imprimer une pièce technique ?' }))],
]

/**
 * Les templates étaient tous en thème sombre alors que le site est passé en
 * clair. Ce test verrouille la charte : un template qui repart sur un fond
 * sombre, ou qui n'utilise pas la mise en page partagée, échoue ici.
 */
const DARK = ['#0A0A0B', '#111113', '#111114', '#FAFAFA', '#8A8A90', '#54545A', '#1f1f25', '#2A2A30']

describe('charte des emails', () => {
  it.each(templates)('%s : thème clair et mise en page partagée', async (name, htmlPromise) => {
    const html = await htmlPromise

    if (process.env.MAIL_OUT) {
      mkdirSync(process.env.MAIL_OUT, { recursive: true })
      writeFileSync(`${process.env.MAIL_OUT}/${name}.html`, html)
    }

    for (const dark of DARK) {
      expect(html, `${name} contient la couleur sombre ${dark}`).not.toContain(dark)
    }
    // Fond de page et surface du thème clair
    expect(html).toContain('#F4F3F0')
    expect(html).toContain('3BeeStudio')
    // `rgba()` est mal composé par Outlook : la charte n'en produit plus.
    expect(html).not.toMatch(/rgba\(/)
  })

  it('rend un aperçu (texte de prévisualisation) sur chaque email', async () => {
    for (const [name, htmlPromise] of templates) {
      const html = await htmlPromise
      expect(html, name).toMatch(/<div[^>]*style="[^"]*display:none/i)
    }
  })
})
