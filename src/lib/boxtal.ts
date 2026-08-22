import type { Order } from '@/types/order'
import type { ShopOrder, DeliveryMode } from '@/types/shop-order'
import type { CustomOrder } from '@/types/custom-order'

const CONTENT_ID = 'content:v1:50180' // Cadeaux, cadeaux entreprise

function getApiUrl(): string {
  return (process.env.BOXTAL_API_URL ?? 'https://api.boxtal.build').replace(/\/$/, '')
}

// Hôte de l'API réellement utilisé — sert à expliquer les erreurs, l'écart
// test (api.boxtal.build) / production (api.boxtal.com) étant invisible sinon.
export function getBoxtalApiHost(): string {
  return new URL(getApiUrl()).host
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

/**
 * Boutique : poids réel depuis les items + 50 g d'emballage.
 * Fallback 100 g/article si weight_grams absent (anciennes commandes).
 *
 * ⚠ Les transporteurs facturent au max(poids réel, poids volumétrique), ce
 * dernier valant L×l×h/5000. L'ancien palier sautait à 45×35×30 dès 1 kg, soit
 * 9,45 kg volumétriques — un carton de 47 litres pour quelques pièces imprimées.
 * Un colis réel de 0,2 kg / 20×20×5 était ainsi facturé comme ~9 kg.
 * Les paliers ci-dessous suivent des formats d'emballage plausibles et gardent
 * le volumétrique proche du poids réel.
 */
export function estimateShopPackage(items: Array<{ quantity: number; weight_grams?: number }>) {
  const totalG = items.reduce((sum, i) => sum + i.quantity * (i.weight_grams ?? 100), 0) + 50
  const weight = Math.max(0.1, Math.round(totalG) / 1000)
  if (weight <= 0.25) return { weight, length: 20, width: 15, height: 5 }
  if (weight <= 0.5)  return { weight, length: 25, width: 20, height: 8 }
  if (weight <= 1)    return { weight, length: 30, width: 22, height: 12 }
  if (weight <= 2)    return { weight, length: 35, width: 25, height: 15 }
  if (weight <= 5)    return { weight, length: 40, width: 30, height: 20 }
  return { weight, length: 45, width: 35, height: 30 }
}

/** Poids volumétrique facturé par les transporteurs (L×l×h/5000), en kg. */
export function volumetricWeight(pkg: { length: number; width: number; height: number }): number {
  return Math.round((pkg.length * pkg.width * pkg.height) / 5000 * 100) / 100
}

// Codes ISO des départements et territoires d'outre-mer français.
const DOM_TOM = new Set(['GP', 'MQ', 'GF', 'RE', 'PM', 'YT', 'NC', 'PF', 'WF', 'BL', 'MF'])

/**
 * Offre point relais. Mondial Relay est l'offre la moins chère du catalogue
 * (~5 € contre ~11 € en Colissimo domicile) — c'est tout l'intérêt du mode relais.
 * Surchargeable sans redéploiement si le contrat Boxtal évolue.
 *
 * ⚠ L'API Boxtal v3 n'expose AUCUN endpoint de devis : le prix n'est connu
 * qu'après création, via `deliveryPriceExclTax`. Impossible donc de comparer
 * les offres à la volée — le choix est fait par politique, pas par prix constaté.
 */
function envList(name: string): string[] | null {
  const raw = process.env[name]
  if (!raw) return null
  const list = raw.split(',').map((c) => c.trim()).filter(Boolean)
  return list.length > 0 ? list : null
}

/**
 * Offre relais utilisée pour CHERCHER les points (le picker cible un réseau donné).
 * Mondial Relay : le réseau relais le plus dense en France, donc le plus de choix
 * pour le client. L'expédition, elle, peut partir sur une autre offre relais
 * (cf. offerCodesFor) — les codes points sont propres au réseau, on garde donc
 * la même offre en tête de liste des deux côtés.
 */
export const RELAY_OFFER_CODE =
  process.env.BOXTAL_RELAY_OFFER_CODE ?? envList('BOXTAL_RELAY_OFFER_CODES')?.[0] ?? 'MONR-CpourToi'

/**
 * Offres candidates, de la moins chère à la plus chère.
 * Faute d'API de devis, on ne peut pas comparer les prix : on tente donc les
 * offres dans l'ordre et on garde la première que le compte accepte. Une offre
 * absente du contrat renvoie `NoShippingOfferException` sans rien créer, donc
 * l'essai suivant est sûr (cf. createShipment).
 */
function offerCodesFor(country: string, mode: DeliveryMode): string[] {
  const upper = country.toUpperCase()

  if (mode === 'relay') {
    // PAS de repli ici : le pickupPointCode enregistré sur la commande vient du
    // réseau interrogé par le picker (RELAY_OFFER_CODE). Basculer sur l'offre
    // relais d'un autre transporteur enverrait un code de point inconnu de
    // celui-ci — colis mal routé ou expédition refusée. Pour changer de réseau
    // relais, changer BOXTAL_RELAY_OFFER_CODE : picker et expédition suivent
    // ensemble.
    return [RELAY_OFFER_CODE]
  }

  if (upper !== 'FR' && !DOM_TOM.has(upper)) {
    // International → Colissimo International (avec signature, plus sécurisé)
    return ['POFR-ColissimoExpertInternational']
  }

  if (DOM_TOM.has(upper)) {
    return ['POFR-ColissimoAccessOutreMer']
  }

  // France métropolitaine — domicile. Mondial Relay Domicile est le moins cher,
  // Colissimo ferme la marche : c'est le plus cher (~11 €), il ne sert que de
  // filet si aucune offre moins chère n'est au contrat.
  // Aucun code de point n'entre en jeu ici, le repli est donc sans risque.
  return envList('BOXTAL_HOME_OFFER_CODES')
    ?? [process.env.BOXTAL_HOME_OFFER_CODE, 'MONR-DomicileFrance', 'POFR-ColissimoAccess']
      .filter((c): c is string => !!c)
}

export interface ParcelPoint {
  code: string
  name: string
  street: string
  city: string
  postalCode: string
  distanceMeters: number | null
  position: { latitude: number; longitude: number } | null
  openingDays: Record<string, { openingTime: string; closingTime: string }[]>
}

/**
 * Points relais autour d'une adresse, triés par distance croissante.
 * Utilisé par le checkout : le client doit choisir un point, `pickupPointCode`
 * est obligatoire côté API pour une offre relais.
 */
export async function searchParcelPoints(params: {
  postalCode: string
  city?: string
  street?: string
  countryIsoCode?: string
}): Promise<ParcelPoint[]> {
  const query = new URLSearchParams({
    postalCode: params.postalCode,
    countryIsoCode: params.countryIsoCode ?? 'FR',
    operationType: 'ARRIVAL',
    shippingOfferCode: RELAY_OFFER_CODE,
  })
  if (params.city) query.set('city', params.city)
  if (params.street) query.set('street', params.street)

  const res = await boxtalFetch(`/shipping/v3.2/parcel-point-by-shipping-offer?${query}`)

  const rows = (res?.content ?? []) as {
    distanceFromSearchLocation?: number
    parcelPoint: {
      code: string
      name: string
      location: {
        street?: string; city?: string; postalCode?: string
        position?: { latitude: number; longitude: number }
      }
      openingDays?: Record<string, { openingTime: string; closingTime: string }[]>
    }
  }[]

  return rows
    .map((r) => ({
      code: r.parcelPoint.code,
      name: r.parcelPoint.name,
      street: r.parcelPoint.location?.street ?? '',
      city: r.parcelPoint.location?.city ?? '',
      postalCode: r.parcelPoint.location?.postalCode ?? '',
      distanceMeters: r.distanceFromSearchLocation ?? null,
      position: r.parcelPoint.location?.position ?? null,
      openingDays: r.parcelPoint.openingDays ?? {},
    }))
    .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))
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
  mode: DeliveryMode
  pickupPointCode?: string | null
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
  // 204 No Content (ex: DELETE réussi) — pas de corps à parser
  if (res.status === 204) return null
  const text = await res.text()
  const json = text ? JSON.parse(text) : null
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

  if (input.mode === 'relay' && !input.pickupPointCode) {
    throw new Error('Point relais manquant sur la commande — impossible de générer l\'étiquette')
  }

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
      // Obligatoire pour une offre relais — l'API refuse l'expédition sans.
      ...(input.mode === 'relay' && input.pickupPointCode
        ? { pickupPointCode: input.pickupPointCode }
        : {}),
      packages: [{
        type: 'PARCEL',
        ...input.pkg,
        value: { value: Math.round(input.totalAmount / 100), currency: 'EUR' },
        content: { id: CONTENT_ID, description: input.description },
      }],
    },
    labelType: 'PDF_A4',
  }

  // Essaie les offres de la moins chère à la plus chère.
  // On ne réessaie QUE sur NoShippingOfferException : c'est un refus au moment
  // de la validation, rien n'a été créé côté Boxtal. Sur toute autre erreur
  // (adresse invalide, poids hors limites…) on s'arrête — réessayer risquerait
  // de créer une seconde expédition facturée.
  const offerCodes = offerCodesFor(input.shipping_country ?? 'FR', input.mode)
  let createRes: { content: { id: string } } | null = null
  let lastError: unknown = null

  for (const shippingOfferCode of offerCodes) {
    try {
      createRes = await boxtalFetch('/shipping/v3.1/shipping-order', {
        method: 'POST',
        body: JSON.stringify({ ...body, shippingOfferCode }),
      })
      console.info('[boxtal]', JSON.stringify({ event: 'shipment_created', offer: shippingOfferCode, mode: input.mode }))
      break
    } catch (err) {
      lastError = err
      const offerRefused = err instanceof Error && err.message.includes('NoShippingOfferException')
      if (!offerRefused) throw err
      console.warn(`[boxtal] Offre ${shippingOfferCode} indisponible, essai suivant`)
    }
  }

  if (!createRes) {
    throw new Error(
      `Aucune offre d'expédition disponible (essayées : ${offerCodes.join(', ')}). ` +
      `Vérifiez les contrats activés sur votre compte Boxtal. ` +
      `Dernière erreur : ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    )
  }

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
    mode: 'delivery',
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
    mode: order.delivery_mode,
    pickupPointCode: order.pickup_point_code,
  })
}

// Retourne null si l'annulation est impossible (colis déjà pris en charge).
/**
 * Sur-mesure : le colis est déclaré à la main par l'admin — une pièce unique
 * n'a ni fiche produit ni quantité dont déduire un poids.
 */
export async function createCustomBoxtalShipment(
  order: CustomOrder,
  pkg: { weight: number; length: number; width: number; height: number },
): Promise<BoxtalResult> {
  return createShipment({
    externalId: order.id,
    recipientName: order.shipping_name ?? order.company ?? order.name,
    email: order.email,
    phone: order.phone,
    shipping_address: order.shipping_address,
    // `custom_orders` n'a pas de second champ d'adresse ni de pays : le
    // sur-mesure ne s'expédie qu'en France pour l'instant.
    shipping_address2: null,
    shipping_city: order.shipping_city,
    shipping_postal_code: order.shipping_postal_code,
    shipping_country: 'FR',
    // Valeur déclarée (assurance transporteur) : le devis fait foi, l'acompte
    // sert de repli sur une demande traitée sans devis complet.
    totalAmount: order.total_amount ?? order.deposit_amount ?? 0,
    pkg,
    description: 'Piece sur-mesure imprimee en 3D',
    mode: 'delivery',
  })
}

export async function cancelBoxtalShipment(boxtalOrderId: string): Promise<void> {
  await boxtalFetch(`/shipping/v3.1/shipping-order/${boxtalOrderId}`, { method: 'DELETE' })
}

/**
 * Récupère une expédition existante. Lève si l'identifiant est inconnu de
 * Boxtal — c'est ce qui permet de valider un id saisi à la main avant de le
 * rattacher à une commande.
 */
export async function getBoxtalShipment(boxtalOrderId: string): Promise<{ shippingCost: number | null }> {
  const res = await boxtalFetch(`/shipping/v3.1/shipping-order/${boxtalOrderId}`)
  const value = res?.content?.deliveryPriceExclTax?.value
  return { shippingCost: typeof value === 'number' ? Math.round(value * 100) : null }
}

/**
 * Coût réel HT de l'expédition, en centimes — ou null si Boxtal ne l'a pas
 * encore calculé. L'API v3 n'ayant aucun endpoint de devis, c'est la seule
 * façon de savoir ce qu'une étiquette a coûté : après création.
 * Best-effort, ne doit jamais faire échouer la génération d'étiquette.
 */
export async function getBoxtalShippingCost(boxtalOrderId: string): Promise<number | null> {
  try {
    const { shippingCost } = await getBoxtalShipment(boxtalOrderId)
    return shippingCost
  } catch (err) {
    console.warn('[boxtal] Coût d\'expédition non récupéré:', err)
    return null
  }
}

export interface BoxtalTracking {
  status: string
  trackingNumber: string | null
  trackingUrl: string | null
}

/**
 * Suivi actuel d'une expédition. Le webhook ne rejoue pas les événements
 * passés : sans ce rattrapage, une expédition rattachée après coup resterait
 * sans numéro de suivi jusqu'au prochain changement de statut.
 * Retourne null si le suivi n'existe pas encore (422 NoPackageTrackingFound).
 */
export async function getBoxtalTracking(boxtalOrderId: string): Promise<BoxtalTracking | null> {
  try {
    const res = await boxtalFetch(`/shipping/v3.1/shipping-order/${boxtalOrderId}/tracking`)
    const first = (res?.content as Array<{
      status?: string
      trackingNumber?: string
      packageTrackingUrl?: string
    }> | undefined)?.[0]
    if (!first?.status) return null
    return {
      status: first.status,
      trackingNumber: first.trackingNumber ?? null,
      trackingUrl: first.packageTrackingUrl ?? null,
    }
  } catch (err) {
    console.warn('[boxtal] Suivi non disponible:', err)
    return null
  }
}

export async function getBoxtalLabel(boxtalOrderId: string): Promise<string> {
  const docsRes = await boxtalFetch(`/shipping/v3.1/shipping-order/${boxtalOrderId}/shipping-document`)
  const docs = docsRes.content as { type: string; url: string }[]
  const url = docs.find(d => d.type === 'LABEL')?.url ?? ''
  if (!url) throw new Error('Étiquette introuvable')
  return url
}
