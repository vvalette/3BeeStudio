'use client'

import { useRef, useState } from 'react'
import NfcPricing from './NfcPricing'
import NfcOrderForm, { type NfcOrderFormHandle } from './NfcOrderForm'

// Relie la grille tarifaire au formulaire : cliquer un palier retient la quantité
// et, si l'étape 1 est déjà remplie, ouvre directement l'étape 2. La quantité
// validée à l'étape 2 remonte ici pour que le palier surligné reste juste.

export default function NfcOrderSection() {
  const formRef = useRef<NfcOrderFormHandle>(null)
  const [quantity, setQuantity] = useState<number | null>(null)
  const [pending, setPending] = useState(false)

  return (
    <>
      <NfcPricing
        selectedQty={quantity}
        pending={pending}
        onPick={async (qty) => {
          setQuantity(qty)
          setPending((await formRef.current?.pickQuantity(qty)) === 'saved')
        }}
      />
      <NfcOrderForm
        ref={formRef}
        onQuantityChange={(qty) => { setQuantity(qty); setPending(false) }}
      />
    </>
  )
}
