'use client'

import { useEffect } from 'react'
import { useCart } from './CartProvider'

export default function CartClearer() {
  const { clear } = useCart()

  useEffect(() => {
    // Vide l'état React ET le localStorage directement.
    // Sans ça, une race condition peut survenir : si l'effet d'hydratation
    // du CartProvider tourne après celui-ci, il recharge le localStorage
    // et réécrit par-dessus le clear().
    clear()
    try { localStorage.removeItem('3bee_cart_v1') } catch { /* ignore */ }
  }, [clear])

  return null
}
