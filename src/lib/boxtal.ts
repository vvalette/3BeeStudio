import type { Order } from '@/types/order'
import type { ShopOrder } from '@/types/shop-order'

const CONTENT_ID = 'content:v1:50180' // Cadeaux, cadeaux entreprise

function getApiUrl(): string {
  return (process.env.BOXTAL_API_URL ?? 'https://api.boxtal.build').replace(/\/$/, '')
}

function getAuth(): string {
  const key = process.env.BOXTAL_ACCESS_KEY
  const secret = process.env.BOXTAL_SECRET_KEY
  if (!key || !secret) throw new Error('BOXTAL_ACCESS_KEY ou BOXTAL_SECRET_KEY non défini')
  return Buffer.from(`${key}:${secret}`).toString('base64')
}

function normalizePhone(phone: string): string {
  const p = phone.replace(/[\s\-\.\(\)]/g, '')
  if (p.startsWith('00')) return '+' + p.slice(2)
  if (/^0[0-9]{9}$/.test(p)) return '+33' + p.slice(1)
  if (p.startsWith('+')) return p
  return '+33' + p
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: '.' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

// NFC : 10 g/badge + 30 g emballage
function estimatePackage(qty: number) {
  const weight = Math.round((qty * 0.010 + 0.03) * 1000) / 1000
  if (qty <= 25)  return { weight, length: 20, width: 15, height: 5 }
  if (qty <= 100) return { weight, length: 30, width: 20, height: 10 }
  return { weight, length: 40, width: 30, height: 15 }
}

// Boutique : poids réel depuis les items + 50 g emballage.
// Fallback 100 g/article si weight_grams absent (anciennes commandes).
function estimateShopPackage(items: Array<{ quantity: number; weight_grams?: number }>) {
  const totalG = items.reduce((sum, i) => sum + i.quantity * (i.weight_grams ?? 100), 0) + 50
  const weight = Math.max(0.1, Math.round(totalG) / 1000)
  if (weight <= 0.25) return { weight, length: 20, width: 15, height: 8 }
  if (weight <= 0.5)  return { weight, length: 25, width: 20, height: 12 }
  if (weight <= 1.0)  return { weight, length: 35, width: 25, height: 20 }
  return { weight, length: 45, width: 35, height: 30 }
}

// Sélectionne l'offre Boxtal selon le poids total.
// BOXTAL_SHIPPING_OFFER_CODE_LIGHT pour les petits colis (≤ 250 g).
function selectOfferCode(weightKg: number): string {
  const light = process.env.BOXTAL_SHIPPING_OFFER_CODE_LIGHT
  if (light && weightKg <= 0.25) return light
  return process.env.BOXTAL_SHIPPING_OFFER_CODE ?? 'POFR-ColissimoExpert'
}

// Forme normalisée d'une expédition, indépendante du type de commande.
interface ShipmentInput {
  externalId: string
  recipientName: string
  email: string
  phone: string | null
  shipping_address: string | null
  shipping_address2: string | null
  shipping_city: string | null
  shipping_postal_code: string | null
  shipping_country: string | null
  totalAmount: number // centimes
  pkg: { weight: number; length: number; width: number; height: number }
  description: string
}

async function boxtalFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${getAuth()}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    },
  })
  const json = await res.json()
  if (!res.ok) {
    const code = json?.errors?.[0]?.code ?? json?.message ?? `HTTP ${res.status}`
    throw new Error(`Boxtal ${path}: ${code}`)
  }
  return json
}

export interface BoxtalResult {
  boxtalOrderId: string
  labelUrl: string
}

// Crée une expédition Boxtal à partir d'une entrée normalisée, puis récupère l'étiquette.
async function createShipment(input: ShipmentInput): Promise<BoxtalResult> {
  const senderFirstName = process.env.BOXTAL_SENDER_FIRSTNAME
  const senderLastName = process.env.BOXTAL_SENDER_LASTNAME
  const senderEmail = process.env.BOXTAL_SENDER_EMAIL
  const senderPhone = process.env.BOXTAL_SENDER_PHONE
  const senderCompany = process.env.BOXTAL_SENDER_COMPANY
  const senderStreet = process.env.BOXTAL_SENDER_STREET
  const senderCity = process.env.BOXTAL_SENDER_CITY
  const senderPostalCode = process.env.BOXTAL_SENDER_POSTAL_CODE

  if (!senderFirstName || !senderLastName || !senderEmail || !senderPhone ||
      !senderCompany || !senderStreet || !senderCity || !senderPostalCode) {
    throw new Error('Variables BOXTAL_SENDER_* non configurées dans .env.local')
  }

  if (!input.phone) throw new Error('Numéro de téléphone destinataire manquant')

  const { firstName, lastName } = splitName(input.recipientName)

  const body = {
    shipment: {
      content: { id: CONTENT_ID, description: input.description },
      externalId: input.externalId.slice(0, 20),
      fromAddress: {
        type: 'BUSINESS',
        contact: {
          firstName: senderFirstName,
          lastName: senderLastName,
          email: senderEmail,
          phone: senderPhone,
          company: senderCompany,
        },
        location: {
          street: senderStreet,
          city: senderCity,
          postalCode: senderPostalCode,
          countryIsoCode: process.env.BOXTAL_SENDER_COUNTRY ?? 'FR',
        },
      },
      toAddress: {
        type: 'RESIDENTIAL',
        contact: {
          firstName,
          lastName,
          email: input.email,
          phone: normalizePhone(input.phone),
        },
        ...(input.shipping_address2 ? { additionalInformation: input.shipping_address2 } : {}),
        location: {
          street: input.shipping_address ?? '',
          city: input.shipping_city ?? '',
          postalCode: input.shipping_postal_code ?? '',
          countryIsoCode: input.shipping_country ?? 'FR',
        },
      },
      packages: [{
        type: 'PARCEL',
        ...input.pkg,
        value: { value: Math.round(input.totalAmount / 100), currency: 'EUR' },
        content: { id: CONTENT_ID, description: input.description },
      }],
    },
    shippingOfferCode: selectOfferCode(input.pkg.weight),
    labelType: 'PDF_A4',
  }

  const createRes = await boxtalFetch('/shipping/v3.1/shipping-order', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  const boxtalOrderId = createRes.content.id as string

  // La commande démarre en PENDING, elle passe CONFIRMED en quelques secondes
  let labelUrl = ''
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 2000))
    try {
      labelUrl = await getBoxtalLabel(boxtalOrderId)
      if (labelUrl) break
    } catch {
      // Encore PENDING, on réessaie
    }
  }

  if (!labelUrl) throw new Error("Étiquette non disponible après plusieurs tentatives")

  return { boxtalOrderId, labelUrl }
}

export async function createBoxtalShipment(order: Order): Promise<BoxtalResult> {
  return createShipment({
    externalId: order.id,
    recipientName: order.shipping_name ?? order.company,
    email: order.email,
    phone: order.phone,
    shipping_address: order.shipping_address,
    shipping_address2: order.shipping_address2,
    shipping_city: order.shipping_city,
    shipping_postal_code: order.shipping_postal_code,
    shipping_country: order.shipping_country,
    totalAmount: order.total_amount,
    pkg: estimatePackage(order.quantity),
    description: 'Porte-clés NFC personnalisés',
  })
}

export async function createShopBoxtalShipment(order: ShopOrder): Promise<BoxtalResult> {
  return createShipment({
    externalId: order.id,
    recipientName: order.shipping_name ?? order.name,
    email: order.email,
    phone: order.phone,
    shipping_address: order.shipping_address,
    shipping_address2: order.shipping_address2,
    shipping_city: order.shipping_city,
    shipping_postal_code: order.shipping_postal_code,
    shipping_country: order.shipping_country,
    totalAmount: order.total_amount,
    pkg: estimateShopPackage(order.items),
    description: 'Objets imprimés en 3D — 3BeeStudio',
  })
}

// Retourne null si l'annulation est impossible (colis déjà pris en charge).
export async function cancelBoxtalShipment(boxtalOrderId: string): Promise<void> {
  await boxtalFetch(`/v3.1/shipping-order/${boxtalOrderId}`, { method: 'DELETE' })
}

export async function getBoxtalLabel(boxtalOrderId: string): Promise<string> {
  const docsRes = await boxtalFetch(`/shipping/v3.1/shipping-order/${boxtalOrderId}/shipping-document`)
  const docs = docsRes.content as { type: string; url: string }[]
  const url = docs.find(d => d.type === 'LABEL')?.url ?? ''
  if (!url) throw new Error('Étiquette introuvable')
  return url
}
