import { describe, it, expect } from 'vitest'
import { plainSummary, formatPrice } from './utils'

describe('formatPrice', () => {
  it('formate des centimes en euros', () => {
    expect(formatPrice(2400).replace(/\u202f|\u00a0/g, ' ')).toBe('24,00 €')
  })
})
describe('plainSummary', () => {
  it('retire le markdown des descriptions produit', () => {
    const md = '**LES AVANTAGES**\n- Sans vis ni outil\n- Imprimé en [France](https://3beestudio.fr)'
    expect(plainSummary(md)).toBe('LES AVANTAGES Sans vis ni outil Imprimé en France')
  })

  it('coupe sur un mot entier et pose une ellipse', () => {
    const out = plainSummary('a'.repeat(40) + ' ' + 'b'.repeat(40), 50)!
    expect(out.endsWith('…')).toBe(true)
    expect(out.length).toBeLessThanOrEqual(51)
    // La coupe tombe sur l'espace, pas au milieu du second mot.
    expect(out).toBe('a'.repeat(40) + '…')
  })

  it('laisse passer un texte déjà court', () => {
    expect(plainSummary('Un support imprimé en France.')).toBe('Un support imprimé en France.')
  })

  it('rend null sur une description absente ou vide de sens', () => {
    expect(plainSummary(null)).toBeNull()
    expect(plainSummary('**  **')).toBeNull()
  })
})
