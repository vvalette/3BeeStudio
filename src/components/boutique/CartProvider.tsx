'use client'

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import type { CartItem } from '@/types/cart'
import { calcShopShipping, cartLineKey, splitCart } from '@/types/shop-product'

const STORAGE_KEY = '3bee_cart_v1'

interface CartContextValue {
  items: CartItem[]
  count: number
  subtotal: number
  shipping: number
  total: number
  freeShippingEnabled: boolean
  /** Sous-total des seuls articles physiques — base du calcul de port. */
  physicalSubtotal: number
  hasDigital: boolean
  hasPhysical: boolean
  isOpen: boolean
  open: () => void
  close: () => void
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void
  /** `lineKey` = `cartLineKey(product_id, color?.key)` : deux coloris = deux lignes. */
  setQuantity: (lineKey: string, quantity: number) => void
  removeItem: (lineKey: string) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

/**
 * Identité d'une ligne de panier. Le même produit dans deux coloris fait deux
 * lignes : elles s'ajoutent, se règlent et se retirent séparément.
 *
 * Le stock, lui, reste commun au produit — le total par produit est revérifié
 * au checkout, seul juge du stock réel.
 */
const keyOf = (item: Pick<CartItem, 'product_id' | 'color'>) =>
  cartLineKey(item.product_id, item.color?.key)

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart doit être utilisé dans un <CartProvider>')
  return ctx
}

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems]   = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(false)

  // Chargement initial depuis localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  // Fetch setting livraison offerte globale
  useEffect(() => {
    fetch('/api/boutique/settings')
      .then((r) => r.json())
      .then((d) => { if (d.free_shipping) setFreeShippingEnabled(true) })
      .catch(() => null)
  }, [])

  // Persistance
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      /* ignore */
    }
  }, [items, hydrated])

  const clampQty = (qty: number, max: number | null) => {
    const upper = max ?? 99
    return Math.max(1, Math.min(qty, upper))
  }

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    const key = keyOf(item)
    setItems((prev) => {
      const existing = prev.find((i) => keyOf(i) === key)
      if (existing) {
        return prev.map((i) =>
          keyOf(i) === key
            ? { ...i, quantity: clampQty(i.quantity + quantity, i.max_stock) }
            : i,
        )
      }
      return [...prev, { ...item, quantity: clampQty(quantity, item.max_stock) }]
    })
  }, [])

  const setQuantity = useCallback((lineKey: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => (keyOf(i) === lineKey ? { ...i, quantity: clampQty(quantity, i.max_stock) } : i)),
    )
  }, [])

  const removeItem = useCallback((lineKey: string) => {
    setItems((prev) => prev.filter((i) => keyOf(i) !== lineKey))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const open  = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  const { count, subtotal, shipping, total, physicalSubtotal, hasDigital, hasPhysical } = useMemo(() => {
    const count = items.reduce((acc, i) => acc + i.quantity, 0)
    const split = splitCart(items.map((i) => ({
      product_type: i.is_digital ? 'digital' as const : 'physical' as const,
      unit_price: i.price,
      quantity: i.quantity,
    })))
    // Le port ne porte que sur la part physique — un fichier ne s'expédie pas et
    // ne doit pas faire franchir le seuil de gratuité.
    //
    // Estimation au tarif POINT RELAIS, le moins cher et le mode proposé par
    // défaut au checkout : afficher les 6,90 € du domicile dans le panier
    // annonçait un port que la plupart des clients ne paient pas, et fait
    // abandonner avant même de voir le choix. Le panier l'annonce donc en
    // « à partir de », le montant exact se fige au choix du mode.
    const shipping = split.hasPhysical
      ? (freeShippingEnabled ? 0 : calcShopShipping(split.physicalSubtotal, 'relay'))
      : 0
    return {
      count,
      subtotal: split.subtotal,
      physicalSubtotal: split.physicalSubtotal,
      hasDigital: split.hasDigital,
      hasPhysical: split.hasPhysical,
      shipping,
      total: split.subtotal + shipping,
    }
  }, [items, freeShippingEnabled])

  const value: CartContextValue = {
    items, count, subtotal, shipping, total, freeShippingEnabled,
    physicalSubtotal, hasDigital, hasPhysical,
    isOpen, open, close,
    addItem, setQuantity, removeItem, clear,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
