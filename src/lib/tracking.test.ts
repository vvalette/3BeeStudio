import { describe, it, expect } from 'vitest'
import { resolveTracking, hasTracking } from './tracking'

const MR = 'https://www.mondialrelay.fr/suivi-de-colis?codeMarque=M1&numeroExpedition=89989452'

describe('resolveTracking', () => {
  it('utilise tracking_url quand elle est renseignée (cas Boxtal)', () => {
    expect(resolveTracking(MR, '89989452')).toEqual({ href: MR, number: '89989452' })
  })

  it('accepte une URL collée dans le champ « numéro de suivi » (saisie manuelle admin)', () => {
    // Le cas qui cassait : href null → la page affichait « Suivi : https://… » en texte brut
    expect(resolveTracking(null, MR)).toEqual({ href: MR, number: null })
  })

  it('garde un numéro simple en texte, sans lien', () => {
    expect(resolveTracking(null, '6A12345678901')).toEqual({ href: null, number: '6A12345678901' })
  })

  it('ignore un protocole non http(s) — le champ admin est libre', () => {
    expect(resolveTracking(null, 'javascript:alert(1)').href).toBeNull()
    expect(resolveTracking('javascript:alert(1)', null).href).toBeNull()
  })

  it('traite vide et espaces comme absent', () => {
    expect(resolveTracking(null, null)).toEqual({ href: null, number: null })
    expect(resolveTracking('  ', '  ')).toEqual({ href: null, number: null })
  })

  it('ne répète pas l’URL sous le bouton quand url et numéro sont identiques', () => {
    expect(resolveTracking(MR, MR)).toEqual({ href: MR, number: null })
  })
})

describe('hasTracking', () => {
  it('vrai dès qu’un lien ou un numéro exploitable existe', () => {
    expect(hasTracking(null, MR)).toBe(true)
    expect(hasTracking(null, '6A123')).toBe(true)
  })

  it('faux sans donnée', () => {
    expect(hasTracking(null, null)).toBe(false)
    expect(hasTracking('  ', '  ')).toBe(false)
  })

  it('une valeur non http(s) reste affichée en texte, jamais en href', () => {
    expect(hasTracking(null, 'javascript:alert(1)')).toBe(true)
    expect(resolveTracking(null, 'javascript:alert(1)').number).toBe('javascript:alert(1)')
  })
})
