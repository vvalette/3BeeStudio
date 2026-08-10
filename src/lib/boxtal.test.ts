import { describe, it, expect } from 'vitest'
import { estimateShopPackage, volumetricWeight } from './boxtal'

describe('estimateShopPackage', () => {
  it('somme le poids des articles + 50 g d’emballage', () => {
    const pkg = estimateShopPackage([{ quantity: 3, weight_grams: 50 }])
    expect(pkg.weight).toBe(0.2) // 150 g + 50 g
  })

  it('retombe sur 100 g/article quand le poids est absent (vieilles commandes)', () => {
    expect(estimateShopPackage([{ quantity: 2 }]).weight).toBe(0.25)
  })

  it('plancher à 0,1 kg', () => {
    expect(estimateShopPackage([{ quantity: 1, weight_grams: 1 }]).weight).toBe(0.1)
  })

  it('ne saute plus à un carton de 47 litres au-dessus de 1 kg', () => {
    // Régression : l'ancien palier renvoyait 45×35×30 dès 1,001 kg, soit
    // 9,45 kg volumétriques — c'est ce qui faisait payer ~11 € un colis de 0,2 kg.
    const pkg = estimateShopPackage([{ quantity: 20, weight_grams: 100 }]) // 2,05 kg
    expect(volumetricWeight(pkg)).toBeLessThan(9)
    expect(pkg.length * pkg.width * pkg.height).toBeLessThan(45 * 35 * 30)
  })

  it('garde le poids volumétrique proche du poids réel sur les petits colis', () => {
    // Cas réel de la commande #2FFAD8BC : 20 bouchons de ~7 g → 0,19 kg
    const pkg = estimateShopPackage([{ quantity: 20, weight_grams: 7 }])
    expect(pkg.weight).toBe(0.19)
    // Le colis réel mesurait 20×20×5 ; on reste au même ordre de grandeur
    expect(volumetricWeight(pkg)).toBeLessThanOrEqual(0.5)
  })

  it('les paliers restent croissants en volume', () => {
    const volumes = [0.2, 0.4, 0.9, 1.5, 4, 10].map((kg) => {
      const p = estimateShopPackage([{ quantity: 1, weight_grams: kg * 1000 - 50 }])
      return p.length * p.width * p.height
    })
    for (let i = 1; i < volumes.length; i++) {
      expect(volumes[i]).toBeGreaterThan(volumes[i - 1])
    }
  })
})

describe('volumetricWeight', () => {
  it('applique le diviseur 5000 des transporteurs', () => {
    expect(volumetricWeight({ length: 20, width: 20, height: 5 })).toBe(0.4)
    expect(volumetricWeight({ length: 45, width: 35, height: 30 })).toBe(9.45)
  })
})
