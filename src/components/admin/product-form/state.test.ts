import { describe, it, expect } from 'vitest'
import { buildInitialState, buildProductPayload } from './state'

function validForm() {
  const f = buildInitialState()
  f.name = 'Vase Hex'
  f.priceEuros = '12,90'
  f.description = 'Un vase.'
  return f
}

describe('buildProductPayload', () => {
  it('convertit les euros (virgule ou point) en centimes', () => {
    const r = buildProductPayload(validForm())
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.payload.price).toBe(1290)
  })

  it('génère le slug depuis le nom quand il est vide', () => {
    const r = buildProductPayload(validForm())
    if (r.ok) expect(r.payload.slug).toBe('vase-hex')
  })

  it('rejette un prix invalide ou nul', () => {
    const f = validForm()
    f.priceEuros = 'abc'
    expect(buildProductPayload(f).ok).toBe(false)
    f.priceEuros = '0'
    expect(buildProductPayload(f).ok).toBe(false)
  })

  it('rejette un prix promo supérieur ou égal au prix de base', () => {
    const f = validForm()
    f.salePriceEuros = '12,90'
    const r = buildProductPayload(f)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('inférieur')
  })

  it('prix promo vide → sale_price null (promo désactivée)', () => {
    const r = buildProductPayload(validForm())
    if (r.ok) expect(r.payload.sale_price).toBeNull()
  })

  it('stock vide → null (illimité), sinon entier', () => {
    const f = validForm()
    let r = buildProductPayload(f)
    if (r.ok) expect(r.payload.stock).toBeNull()
    f.stock = '7'
    r = buildProductPayload(f)
    if (r.ok) expect(r.payload.stock).toBe(7)
  })
})
