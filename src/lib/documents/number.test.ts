import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: {} }))

import { nextInSequence } from './number'

describe('nextInSequence', () => {
  it('commence à 001', () => {
    expect(nextInSequence('FAC-2026-', [])).toBe('FAC-2026-001')
  })

  it('suit le plus grand numéro émis', () => {
    expect(nextInSequence('FAC-2026-', ['FAC-2026-002', 'FAC-2026-014', 'FAC-2026-009'])).toBe('FAC-2026-015')
  })

  it('passe 999 sans se bloquer (le tri texte mettrait 1000 avant 999)', () => {
    expect(nextInSequence('FAC-2026-', ['FAC-2026-999', 'FAC-2026-1000'])).toBe('FAC-2026-1001')
  })

  it('ignore une référence manuelle qui ne finit pas par un entier', () => {
    expect(nextInSequence('DEV-2026-', ['DEV-2026-004', 'DEV-2026-A12', null])).toBe('DEV-2026-005')
  })
})
