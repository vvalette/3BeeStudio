import { describe, it, expect } from 'vitest'
import { reconcileCart, type CartSyncProduct } from './cart-sync'
import type { CartItem } from '@/types/cart'

const product = (over: Partial<CartSyncProduct> = {}): CartSyncProduct => ({
  id:           '11111111-1111-1111-1111-111111111111',
  name:         'Bouchon de cartouche',
  slug:         'bouchon-de-cartouche',
  price:        50,
  sale_price:   null,
  images:       ['https://img/bouchon.jpg'],
  stock:        null,
  product_type: 'physical',
  colors:       null,
  ...over,
})

const line = (over: Partial<CartItem> = {}): CartItem => ({
  product_id:     '11111111-1111-1111-1111-111111111111',
  name:           'Bouchon de cartouche',
  slug:           'bouchon-de-cartouche',
  price:          50,
  original_price: null,
  image:          'https://img/bouchon.jpg',
  quantity:       2,
  max_stock:      null,
  ...over,
})

describe('reconcileCart', () => {
  // Le cas qui a motivé le module : prix passé de 0,40 € à 0,50 € en base, panier
  // resté en localStorage. Le récapitulatif annonçait 0,40 €, Stripe facturait 0,50 €.
  it('réaligne un prix devenu obsolète', () => {
    const [l] = reconcileCart([line({ price: 40 })], [product({ price: 50 })])
    expect(l.price).toBe(50)
  })

  it('reprend le prix promo et barre le prix de base', () => {
    const [l] = reconcileCart([line()], [product({ price: 50, sale_price: 40 })])
    expect(l.price).toBe(40)
    expect(l.original_price).toBe(50)
  })

  it('retire le prix barré quand la promo est terminée', () => {
    const [l] = reconcileCart([line({ price: 40, original_price: 50 })], [product({ price: 50 })])
    expect(l.price).toBe(50)
    expect(l.original_price).toBeNull()
  })

  it('suit le nom, le slug et la photo du produit', () => {
    const [l] = reconcileCart([line()], [product({ name: 'Bouchon v2', slug: 'bouchon-v2', images: ['https://img/v2.jpg'] })])
    expect(l).toMatchObject({ name: 'Bouchon v2', slug: 'bouchon-v2', image: 'https://img/v2.jpg' })
  })

  // Le checkout renvoie 404 sur un produit inactif et bloque le panier entier :
  // mieux vaut retirer la ligne morte que laisser le client coincé.
  it('retire une ligne dont le produit n’est plus disponible', () => {
    expect(reconcileCart([line()], [])).toEqual([])
  })

  it('retire une ligne en rupture de stock', () => {
    expect(reconcileCart([line()], [product({ stock: 0 })])).toEqual([])
  })

  it('ramène la quantité au stock restant', () => {
    const [l] = reconcileCart([line({ quantity: 8 })], [product({ stock: 3 })])
    expect(l.quantity).toBe(3)
    expect(l.max_stock).toBe(3)
  })

  it('suit le passage d’un produit en numérique', () => {
    const [l] = reconcileCart([line()], [product({ product_type: 'digital' })])
    expect(l.is_digital).toBe(true)
  })

  it('rafraîchit le libellé d’un coloris renommé, sans changer le choix', () => {
    const [l] = reconcileCart(
      [line({ color: { key: 'noir', label: 'Noir', hex: '#000000' } })],
      [product({ colors: [{ key: 'noir', label: 'Noir profond', hex: '#0A0A0B' }] })],
    )
    expect(l.color).toEqual({ key: 'noir', label: 'Noir profond', hex: '#0A0A0B' })
  })

  // Le checkout refuse la ligne avec un message qui renvoie sur la fiche produit :
  // la resynchro n'a pas à choisir un coloris à la place du client.
  it('laisse en l’état un coloris retiré de la palette', () => {
    const [l] = reconcileCart(
      [line({ color: { key: 'rouge', label: 'Rouge', hex: '#FF0000' } })],
      [product({ colors: [{ key: 'noir', label: 'Noir', hex: '#000000' }] })],
    )
    expect(l.color).toEqual({ key: 'rouge', label: 'Rouge', hex: '#FF0000' })
  })

  // Cas courant : rien à réécrire dans le localStorage, rien à re-rendre.
  it('retourne le tableau d’origine quand rien n’a changé', () => {
    const items = [line()]
    expect(reconcileCart(items, [product()])).toBe(items)
  })
})
