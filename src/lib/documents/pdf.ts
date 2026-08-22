import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib'
import { QUOTE_LOGO_PNG_BASE64 } from './logo'
import type { CustomOrder, QuoteLineItem } from '@/types/custom-order'

/**
 * Documents PDF 3BeeStudio : devis et factures.
 *
 * Reprend au point près la maquette validée (docs/reference/devis-modele.pdf,
 * produite à la main sous ReportLab) : mêmes marges, mêmes couleurs, mêmes
 * corps de texte. Le tableau et les conditions coulent verticalement, donc un
 * document à huit lignes reste lisible là où la maquette n'en montrait qu'une.
 *
 * Devis et facture partagent tout sauf l'en-tête, les conditions et le pied :
 * un devis attend une signature, une facture constate un paiement reçu.
 */

// ── Géométrie (points PostScript, A4) ────────────────────────────────────────
const PAGE_W = 595.2756
const PAGE_H = 841.8898
const LEFT   = 56.69291   // 20 mm
const RIGHT  = 538.5827
const WIDTH  = RIGHT - LEFT
const PAD    = 11.33858   // 4 mm — retrait du texte dans les bandes
const COL_CLIENT = 311.811
const COL_QTY    = 362.8347 // bord droit
const COL_UNIT   = 453.5433 // bord droit
const COL_TOTAL  = 527.2441 // bord droit

// ── Couleurs ─────────────────────────────────────────────────────────────────
const AMBER  = rgb(0.914, 0.663, 0.102) // #E9A91A
const INK    = rgb(0.145, 0.145, 0.145) // #242424
const MUTED  = rgb(0.42, 0.42, 0.42)    // #6B6B6B
const LINE   = rgb(0.88, 0.88, 0.88)    // #E0E0E0
const CREAM  = rgb(0.976, 0.965, 0.937) // #F8F6EE
const WHITE  = rgb(1, 1, 1)

// ── Identité de l'émetteur ───────────────────────────────────────────────────
const ISSUER = {
  name: '3BeeStudio',
  lines: [
    'Micro-entreprise — VALETTE Valentin',
    '144 rue de la République',
    '69220 Belleville-en-Beaujolais',
    'SIRET : 931 419 550 00039',
    'contact@3beestudio.fr',
    '3beestudio.fr',
  ],
  signatory: 'Valentin Valette',
  footer: [
    '3BeeStudio — Micro-entreprise VALETTE Valentin — 144 rue de la République, 69220 Belleville-en-Beaujolais',
    'SIREN 931 419 550 · SIRET 931 419 550 00039 · contact@3beestudio.fr · 3beestudio.fr',
  ],
}

/** Jours de validité du devis, alignés sur la mention des conditions. */
export const QUOTE_VALIDITY_DAYS = 30

/** Destinataire imprimé dans le bloc CLIENT. */
export interface DocumentRecipient {
  name: string
  company?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  postalCode?: string | null
  city?: string | null
}

/**
 * Ligne de total hors désignations : port, remise, ajustement. Un montant
 * négatif s'imprime tel quel (« − 8,00 € »).
 */
export interface DocumentAdjustment {
  label: string
  amount: number // centimes
}

export interface DocumentPdfInput {
  kind: 'quote' | 'invoice'
  /** Numéro imprimé : DEV-AAAA-NNN ou FAC-AAAA-NNN. */
  number: string
  recipient: DocumentRecipient
  /** Objet du document — une phrase, imprimée dans le bandeau crème. */
  object: string
  items: QuoteLineItem[]
  adjustments?: DocumentAdjustment[]
  /** Défaut : maintenant. Fixé pour qu'un document régénéré soit identique. */
  issuedAt?: Date
  /** Devis : découpe acompte / solde annoncée dans les conditions. */
  depositAmount?: number | null
  /** Facture : date d'encaissement, mentionnée comme acquittement. */
  paidAt?: Date | null
  /** Facture : rappel de la référence de commande côté client. */
  orderRef?: string | null
}

// ── Encodage ─────────────────────────────────────────────────────────────────

/**
 * Sous-ensemble de WinAnsi que l'on imprime : latin-1 imprimable plus la
 * poignée de signes typographiques utilisés par la maquette.
 */
const REPRESENTABLE = "\\u0020-\\u007e\\u00a1-\\u00ff\\u20ac\\u2014\\u2022\\u00b7\\u00ab\\u00bb\\u0152\\u0153"
const REPRESENTABLE_LINE = new RegExp(`^[${REPRESENTABLE}\\n]*$`)
const REPRESENTABLE_CHAR_G = new RegExp(`[^${REPRESENTABLE}]`, 'g')

/**
 * Les polices standard PDF sont limitées à WinAnsi. Un nom de client hors de ce
 * jeu (caractères turcs, cyrilliques, emoji) ferait planter `drawText` et donc
 * tout l'envoi du devis — on translittère au plus proche, puis on jette le reste.
 */
function winAnsi(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')   // diacritiques décomposés
    .normalize('NFC')
    .replace(/[\u2018\u2019\u201b]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2010\u2011\u2012]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(REPRESENTABLE_CHAR_G, '')
}

/**
 * `winAnsi` décompose et retire les diacritiques : l'appliquer systématiquement
 * abîmerait « é ». On ne l'invoque donc que si le texte contient réellement un
 * caractère hors WinAnsi.
 */
function safe(input: string): string {
  const cleaned = input.replace(/\u00a0/g, ' ')
  return REPRESENTABLE_LINE.test(cleaned) ? cleaned : winAnsi(cleaned)
}

// ── Formatage ────────────────────────────────────────────────────────────────

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`
}

function frDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Paris' })
}

/** Total d'une ligne, en centimes. */
export function lineTotal(item: QuoteLineItem): number {
  return Math.round(item.quantity * item.unit_price)
}

export function quoteTotal(items: QuoteLineItem[]): number {
  return items.reduce((sum, i) => sum + lineTotal(i), 0)
}

// ── Moteur de rendu ──────────────────────────────────────────────────────────

class QuoteDoc {
  page!: PDFPage
  y = 0

  constructor(
    private doc: PDFDocument,
    readonly regular: PDFFont,
    readonly bold: PDFFont,
  ) {}

  newPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H])
    this.y = PAGE_H - 79.37 // 28 mm de marge haute
    return this.page
  }

  text(s: string, x: number, y: number, font: PDFFont, size: number, color: RGB) {
    this.page.drawText(safe(s), { x, y, font, size, color })
  }

  textRight(s: string, xRight: number, y: number, font: PDFFont, size: number, color: RGB) {
    const clean = safe(s)
    this.page.drawText(clean, { x: xRight - font.widthOfTextAtSize(clean, size), y, font, size, color })
  }

  textCenter(s: string, y: number, font: PDFFont, size: number, color: RGB) {
    const clean = safe(s)
    this.page.drawText(clean, { x: (PAGE_W - font.widthOfTextAtSize(clean, size)) / 2, y, font, size, color })
  }

  band(yBottom: number, height: number, color: RGB, x = LEFT, width = WIDTH) {
    this.page.drawRectangle({ x, y: yBottom, width, height, color })
  }

  rule(y: number, color: RGB, thickness: number) {
    this.page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT, y }, color, thickness })
  }

  /** Découpe un texte pour qu'il tienne dans `maxWidth`. */
  wrap(s: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const words = safe(s).split(/\s+/).filter(Boolean)
    if (words.length === 0) return []
    const lines: string[] = []
    let current = words[0]
    for (const word of words.slice(1)) {
      const candidate = `${current} ${word}`
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate
      else { lines.push(current); current = word }
    }
    lines.push(current)
    return lines
  }
}

// ── Composition ──────────────────────────────────────────────────────────────

export async function buildDocumentPdf(input: DocumentPdfInput): Promise<Uint8Array> {
  const { kind, number, recipient, object, items } = input
  const isInvoice = kind === 'invoice'
  const issuedAt = input.issuedAt ?? new Date()
  const validUntil = new Date(issuedAt.getTime() + QUOTE_VALIDITY_DAYS * 24 * 3600 * 1000)

  const doc = await PDFDocument.create()
  doc.setTitle(`${isInvoice ? 'Facture' : 'Devis'} 3BeeStudio ${number}`)
  doc.setAuthor('3BeeStudio - VALETTE Valentin')
  doc.setSubject(safe(object))
  doc.setCreationDate(issuedAt)

  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold    = await doc.embedFont(StandardFonts.HelveticaBold)
  const logo    = await doc.embedPng(Buffer.from(QUOTE_LOGO_PNG_BASE64, 'base64'))

  const d = new QuoteDoc(doc, regular, bold)
  d.newPage()

  // ── En-tête : logo + bloc titre ──
  d.page.drawImage(logo, { x: LEFT, y: 711.4961, width: 86.10691, height: 73.70079 })
  d.textRight(isInvoice ? 'FACTURE' : 'DEVIS', RIGHT, 762.5197, bold, 26, AMBER)
  d.textRight(`N° ${number}`, RIGHT, 745.5118, regular, 9.5, MUTED)
  d.textRight(`Date : ${frDate(issuedAt)}`, RIGHT, 731.3386, regular, 9.5, MUTED)
  d.textRight(
    isInvoice
      ? (input.orderRef ? `Commande : ${input.orderRef}` : 'Facture acquittée')
      : `Validité : ${frDate(validUntil)}`,
    RIGHT, 717.1654, regular, 9.5, MUTED,
  )
  d.rule(683.1496, AMBER, 1.6)

  // ── Émetteur / Client ──
  d.text('ÉMETTEUR', LEFT, 657.6378, bold, 8, AMBER)
  d.text('CLIENT', COL_CLIENT, 657.6378, bold, 8, AMBER)

  const LEADING = 13.6063
  let yIssuer = 640.6299
  d.text(ISSUER.name, LEFT, yIssuer, bold, 10.5, INK)
  for (const line of ISSUER.lines) {
    yIssuer -= LEADING
    d.text(line, LEFT, yIssuer, regular, 9, MUTED)
  }

  let yClient = 640.6299
  d.text(recipient.name, COL_CLIENT, yClient, bold, 10.5, INK)
  const clientLines = [
    recipient.company,
    recipient.address,
    [recipient.postalCode, recipient.city].filter(Boolean).join(' ') || null,
    recipient.email,
    recipient.phone || null,
  ].filter((l): l is string => !!l && l.trim().length > 0)
  for (const line of clientLines) {
    yClient -= LEADING
    d.text(line, COL_CLIENT, yClient, regular, 9, MUTED)
  }

  // ── Objet ──
  d.y = Math.min(yIssuer, yClient) - 30.61
  const objectLines = d.wrap(`Objet : ${object}`, regular, 9.5, WIDTH - 2 * PAD)
  const objectHeight = 25.51181 + (objectLines.length - 1) * 12.76
  d.band(d.y - objectHeight, objectHeight, CREAM)
  let yObject = d.y - 16.9
  for (const line of objectLines) {
    d.text(line, LEFT + PAD, yObject, regular, 9.5, INK)
    yObject -= 12.76
  }
  d.y -= objectHeight

  // ── Tableau ──
  d.y -= 25.52
  drawTableHeader(d)

  const labelWidth = COL_QTY - 17.01 - (LEFT + 8.5)
  for (const [index, item] of items.entries()) {
    const labelLines  = d.wrap(item.label, bold, 9.5, labelWidth)
    const detailLines = (item.detail ?? '')
      .split('\n')
      .filter((l) => l.trim())
      .flatMap((l) => d.wrap(l, regular, 8.3, labelWidth))

    const labelBlock  = 17.01 + (labelLines.length - 1) * 12.76
    const detailBlock = detailLines.length ? 12.76 + (detailLines.length - 1) * 9.92 : 0
    const rowHeight   = labelBlock + detailBlock + 5.67

    // Report de tableau : une page neuve plutôt qu'une ligne coupée en deux.
    if (d.y - rowHeight < 150) {
      d.newPage()
      d.y -= 40
      drawTableHeader(d)
    }

    const rowTop = d.y
    if (index % 2 === 0) d.band(rowTop - rowHeight, rowHeight, CREAM)

    let yLabel = rowTop - 17.01
    for (const line of labelLines) {
      d.text(line, LEFT + 8.5, yLabel, bold, 9.5, INK)
      yLabel -= 12.76
    }
    let yDetail = yLabel - 0.05
    for (const line of detailLines) {
      d.text(line, LEFT + 8.5, yDetail, regular, 8.3, MUTED)
      yDetail -= 9.92
    }

    const yAmount = rowTop - rowHeight / 2
    d.textRight(String(item.quantity), COL_QTY, yAmount, regular, 9.5, INK)
    d.textRight(euros(item.unit_price), COL_UNIT, yAmount, regular, 9.5, INK)
    d.textRight(euros(lineTotal(item)), COL_TOTAL, yAmount, bold, 9.5, INK)

    d.y -= rowHeight
  }

  d.rule(d.y, LINE, 0.6)

  // ── Totaux ──
  const adjustments = input.adjustments ?? []
  const linesTotal = quoteTotal(items)
  const total = linesTotal + adjustments.reduce((sum, a) => sum + a.amount, 0)

  let yNet = d.y - 20.4
  if (adjustments.length > 0) {
    d.text('Sous-total', 334.4882, yNet, regular, 9.5, MUTED)
    d.textRight(euros(linesTotal), COL_TOTAL, yNet, regular, 9.5, INK)
    for (const adjustment of adjustments) {
      yNet -= 13.61
      d.text(adjustment.label, 334.4882, yNet, regular, 9.5, MUTED)
      d.textRight(
        `${adjustment.amount < 0 ? '- ' : ''}${euros(Math.abs(adjustment.amount))}`,
        COL_TOTAL, yNet, regular, 9.5, INK,
      )
    }
    yNet -= 15.6
  } else {
    yNet = d.y - 28.34
  }
  d.text('Total net à payer', 334.4882, yNet, regular, 9.5, MUTED)
  d.textRight(euros(total), COL_TOTAL, yNet, regular, 10, INK)

  const BOX_H = 31.1811
  const boxBottom = yNet - 5.67 - BOX_H
  d.band(boxBottom, BOX_H, AMBER, 323.1496, RIGHT - 323.1496)
  d.text('TOTAL TTC', 334.4882, boxBottom + 8.5, bold, 11, WHITE)
  d.textRight(euros(total), COL_TOTAL, boxBottom + 8.5, bold, 13, WHITE)

  const yTva = boxBottom - 17.01
  d.textRight('TVA non applicable, art. 293 B du CGI', RIGHT, yTva, regular, 8, MUTED)
  d.y = yTva

  // ── Conditions ──
  const deposit = input.depositAmount ?? null
  const settlement = deposit && deposit < total
    ? `Règlement : acompte de ${euros(deposit)} à la commande, solde de ${euros(total - deposit)} avant expédition.`
    : `Règlement : intégralité à la commande (${euros(total)}).`

  const conditions = isInvoice
    ? [
        input.paidAt
          ? `Facture acquittée le ${frDate(input.paidAt)} — paiement en ligne sécurisé.`
          : 'Facture acquittée — paiement en ligne sécurisé.',
        'TVA non applicable, art. 293 B du CGI — micro-entreprise non assujettie.',
        // Mention obligatoire entre professionnels (art. L441-9 du Code de commerce).
        'Pénalités de retard : 3 fois le taux d\'intérêt légal. Indemnité forfaitaire pour frais de recouvrement : 40 €.',
        'Les modèles 3D restent la propriété intellectuelle de 3BeeStudio.',
      ]
    : [
        `Validité du devis : ${QUOTE_VALIDITY_DAYS} jours à compter de la date d'émission.`,
        'Délai de fabrication : 5 à 7 jours ouvrés après acceptation du devis.',
        settlement,
        'Moyens de paiement : virement bancaire ou paiement en ligne sécurisé.',
        'Livraison : remise en main propre ou expédition en France métropolitaine.',
        'Les modèles 3D restent la propriété intellectuelle de 3BeeStudio.',
      ]

  const conditionsHeight = 17 + conditions.length * 14.17
  // Le cartouche de signature est ancré en bas de page : si les conditions
  // mordraient dessus, elles passent sur une page neuve.
  if (d.y - conditionsHeight < 175) {
    d.newPage()
    d.y = PAGE_H - 100
  }

  d.y -= 39.69
  d.text('CONDITIONS', LEFT, d.y, bold, 8, AMBER)
  d.y -= 17
  for (const condition of conditions) {
    d.text('•', LEFT, d.y, regular, 9, AMBER)
    for (const line of d.wrap(condition, regular, 8.6, WIDTH - PAD)) {
      d.text(line, LEFT + PAD, d.y, regular, 8.6, MUTED)
      d.y -= 14.17
    }
  }

  // ── Cartouche + pied de page (ancrés en bas de la dernière page) ──
  // Une facture ne se signe pas : le cartouche constate le paiement au lieu de
  // réclamer un « bon pour accord ».
  d.page.drawRectangle({
    x: LEFT, y: 89.00787, width: 232.4409, height: 73.70079,
    borderColor: isInvoice ? AMBER : LINE, borderWidth: 0.8,
  })
  if (isInvoice) {
    d.text('PAYÉ', LEFT + PAD, 145.7008, bold, 12, AMBER)
    d.text(
      input.paidAt ? `Réglée le ${frDate(input.paidAt)}` : 'Règlement encaissé',
      LEFT + PAD, 128.7, regular, 8, MUTED,
    )
    d.text('Aucun règlement complémentaire attendu.', LEFT + PAD, 97.5118, regular, 6.8, MUTED)
  } else {
    d.text('BON POUR ACCORD', LEFT + PAD, 145.7008, bold, 8.5, INK)
    d.text('Date et signature du client', LEFT + PAD, 131.5276, regular, 7.5, MUTED)
    d.text('(précédé de la mention « Bon pour accord »)', LEFT + PAD, 97.5118, regular, 6.8, MUTED)
  }
  d.text(ISSUER.name, 306.1417, 145.7008, bold, 8.5, INK)
  d.text(ISSUER.signatory, 306.1417, 131.5276, regular, 8, MUTED)

  d.rule(85.03937, LINE, 0.6)
  d.textCenter(ISSUER.footer[0], 72.2835, regular, 7.2, MUTED)
  d.textCenter(ISSUER.footer[1], 62.3622, regular, 7.2, MUTED)

  return doc.save()
}

function drawTableHeader(d: QuoteDoc) {
  const HEADER_H = 22.67717
  d.band(d.y - HEADER_H, HEADER_H, INK)
  const yText = d.y - HEADER_H + 7.37
  d.text('DÉSIGNATION', LEFT + 8.5, yText, d.bold, 8.5, WHITE)
  d.textRight('QTÉ', COL_QTY, yText, d.bold, 8.5, WHITE)
  d.textRight('PRIX UNIT.', COL_UNIT, yText, d.bold, 8.5, WHITE)
  d.textRight('TOTAL', COL_TOTAL, yText, d.bold, 8.5, WHITE)
  d.y -= HEADER_H
}

/** Nom de fichier proposé au téléchargement / en pièce jointe. */
export function documentFileName(kind: 'quote' | 'invoice', number: string, clientName: string): string {
const slug = safe(clientName)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const prefix = kind === 'invoice' ? 'Facture' : 'Devis'
  return `${prefix}_3BeeStudio_${number}${slug ? `_${slug}` : ''}.pdf`
}

export function quoteFileName(quoteNumber: string, clientName: string): string {
  return documentFileName('quote', quoteNumber, clientName)
}

export function invoiceFileName(invoiceNumber: string, clientName: string): string {
  return documentFileName('invoice', invoiceNumber, clientName)
}

/**
 * Devis d'un projet sur-mesure — le destinataire se déduit de la demande.
 * Conserve la signature d'appel historique.
 */
export interface QuotePdfInput {
  order: CustomOrder
  quoteNumber: string
  object: string
  items: QuoteLineItem[]
  issuedAt?: Date
  depositAmount?: number | null
}

export function buildQuotePdf(input: QuotePdfInput): Promise<Uint8Array> {
  const { order } = input
  return buildDocumentPdf({
    kind: 'quote',
    number: input.quoteNumber,
    recipient: {
      name: order.name,
      company: order.company,
      email: order.email,
      phone: order.phone,
      address: order.shipping_address,
      postalCode: order.shipping_postal_code,
      city: order.shipping_city,
    },
    object: input.object,
    items: input.items,
    issuedAt: input.issuedAt,
    depositAmount: input.depositAmount ?? order.deposit_amount,
  })
}
