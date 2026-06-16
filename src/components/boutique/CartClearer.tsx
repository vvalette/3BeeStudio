'use client'

import { useEffect } from 'react'
import { useCart } from './CartProvider'

export default function CartClearer() {
  const { clear } = useCart()

  useEffect(() => {
    clear()
  }, [clear])

  return null
}
