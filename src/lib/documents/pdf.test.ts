import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { buildQuotePdf, quoteTotal, lineTotal } from './pdf'
import type { CustomOrder, QuoteLineItem } from '@/types/custom-order'

const order = {
  name: 'Jean Dupont',
  company: null,
  email: 'jean@exemple.fr',
  phone: '',
  shipping_address: null,
  shipping_city: null,
  shipping_postal_code: null,
  deposit_amount: 1750,
  total_amount: 3500,
} as unknown as CustomOrder

const item: QuoteLineItem = {
  label: 'Cache en H pour poteau de clôture',
  detail: 'Impression 3D FDM, filament PETG\nColoris au choix',
  quantity: 10,
  unit_price: 350,
}

function build(overrides: Partial<Parameters<typeof buildQuotePdf>[0]> = {}) {
  return buildQuotePdf({
    order,
    quoteNumber: 'DEV-2026-001',
    object: 'fabrication de caches en H — impression 3D PETG',
    items: [item],
    issuedAt: new Date('2026-08-16T11:37:36Z'),
    depositAmount: 1750,
    ...overrides,
  })
}

describe('totaux', () => {
  it('multiplie quantité et prix unitaire', () => {
    expect(lineTotal(item)).toBe(3500)
    expect(quoteTotal([item, { ...item, quantity: 2, unit_price: 125 }])).toBe(3750)
  })

  it('arrondit au centime', () => {
    expect(lineTotal({ label: 'x', quantity: 3, unit_price: 333 })).toBe(999)
  })
})

describe('rendu PDF', () => {
  it('produit un PDF d’une page', async () => {
    const bytes = await build()
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-')
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(1)
    expect(doc.getTitle()).toBe('Devis 3BeeStudio DEV-2026-001')
  })

  it('passe à une deuxième page quand les lignes débordent', async () => {
    const many = Array.from({ length: 14 }, (_, i) => ({ ...item, label: `Pièce ${i + 1}` }))
    const doc = await PDFDocument.load(await build({ items: many }))
    expect(doc.getPageCount()).toBeGreaterThan(1)
  })

  it('ne casse pas sur un nom hors WinAnsi', async () => {
    // Les polices PDF standard ne couvrent pas le cyrillique ni les emoji : sans
    // translittération, `drawText` lèverait et tout l'envoi du devis échouerait.
    const exotic = { ...order, name: 'Дмитрий 🐝 Öztürk', company: 'Ünïcode Ltd' } as unknown as CustomOrder
    await expect(build({ order: exotic })).resolves.toBeInstanceOf(Uint8Array)
  })

  it('accepte un devis sans acompte', async () => {
    await expect(build({ depositAmount: null })).resolves.toBeInstanceOf(Uint8Array)
  })
})
