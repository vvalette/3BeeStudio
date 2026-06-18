'use client'

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import type { CartItem } from '@/types/cart'
import { calcShopShipping } from '@/types/shop-product'

const STORAGE_KEY = '3bee_cart_v1'

interface CartContextValue {
  items: CartItem[]
  count: number
  subtotal: number
  shipping: number
  total: number
  freeShippingEnabled: boolean
  isOpen: boolean
  open: () => void
  close: () => void
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void
  setQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

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
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === item.product_id)
      if (existing) {
        return prev.map((i) =>
          i.product_id === item.product_id
            ? { ...i, quantity: clampQty(i.quantity + quantity, i.max_stock) }
            : i,
        )
      }
      return [...prev, { ...item, quantity: clampQty(quantity, item.max_stock) }]
    })
  }, [])

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => (i.product_id === productId ? { ...i, quantity: clampQty(quantity, i.max_stock) } : i)),
    )
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const open  = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  const { count, subtotal, shipping, total } = useMemo(() => {
    const count    = items.reduce((acc, i) => acc + i.quantity, 0)
    const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0)
    const shipping = items.length > 0 ? (freeShippingEnabled ? 0 : calcShopShipping(subtotal)) : 0
    return { count, subtotal, shipping, total: subtotal + shipping }
  }, [items, freeShippingEnabled])

  const value: CartContextValue = {
    items, count, subtotal, shipping, total, freeShippingEnabled,
    isOpen, open, close,
    addItem, setQuantity, removeItem, clear,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
