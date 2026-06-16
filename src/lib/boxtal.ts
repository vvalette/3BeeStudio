import type { Order } from '@/types/order'

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

function estimatePackage(qty: number) {
  const weight = Math.round((qty * 0.015 + 0.05) * 1000) / 1000
  if (qty <= 25) return { weight, length: 20, width: 15, height: 5 }
  if (qty <= 100) return { weight, length: 30, width: 20, height: 10 }
  return { weight, length: 40, width: 30, height: 15 }
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

export async function createBoxtalShipment(order: Order): Promise<BoxtalResult> {
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

  const { firstName, lastName } = splitName(order.shipping_name ?? order.company)
  const pkg = estimatePackage(order.quantity)

  const body = {
    shipment: {
      content: { id: CONTENT_ID, description: 'Porte-clés NFC personnalisés' },
      externalId: order.id.slice(0, 20),
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
          email: order.email,
          phone: normalizePhone(order.phone),
        },
        ...(order.shipping_address2 ? { additionalInformation: order.shipping_address2 } : {}),
        location: {
          street: order.shipping_address ?? '',
          city: order.shipping_city ?? '',
          postalCode: order.shipping_postal_code ?? '',
          countryIsoCode: order.shipping_country ?? 'FR',
        },
      },
      packages: [{
        ...pkg,
        value: { value: Math.round(order.total_amount / 100), currency: 'EUR' },
        content: { id: CONTENT_ID, description: 'Porte-clés NFC' },
      }],
    },
    shippingOfferCode: process.env.BOXTAL_SHIPPING_OFFER_CODE ?? 'POFR-ColissimoExpert',
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

export async function getBoxtalLabel(boxtalOrderId: string): Promise<string> {
  const docsRes = await boxtalFetch(`/shipping/v3.1/shipping-order/${boxtalOrderId}/shipping-document`)
  const docs = docsRes.content as { type: string; url: string }[]
  const url = docs.find(d => d.type === 'LABEL')?.url ?? ''
  if (!url) throw new Error('Étiquette introuvable')
  return url
}
