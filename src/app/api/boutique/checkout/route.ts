import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { calcShopShipping, mergeCartQuantities, computeNewsletterDiscount, findProductColor } from '@/types/shop-product'
import type { MergedCartLine, SelectedColor, ShopProduct } from '@/types/shop-product'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { checkPromo, normalizeCode, promoReplacesNewsletter } from '@/lib/promo'
import type { PromoCode } from '@/types/promo'
import { sendCriticalAlert } from '@/lib/alert'
import { z } from 'zod'

const schema = z.object({
  items: z.array(z.object({
    product_id:          z.string().uuid(),
    quantity:            z.number().int().min(1).max(100),
    // Clé du coloris choisi, revalidée contre la palette du produit plus bas :
    // le client n'envoie jamais le libellé, encore moins un coloris inexistant.
    color:               z.string().max(50).optional(),
    custom_field_values: z.record(z.string().max(200)).optional(),
  })).min(1).max(20),
  email:         z.string().email(),
  name:          z.string().min(2),
  phone:         z.string().min(8).optional(),
  delivery_mode: z.enum(['delivery', 'pickup', 'relay', 'digital']).default('delivery'),

  /**
   * Jeton du panier abandonné repris depuis l'email de relance. Sert uniquement
   * à attribuer la commande à cette relance une fois le paiement confirmé.
   */
  recovery_token: z.string().min(10).max(200).optional(),

  /**
   * Renoncement explicite au droit de rétractation (art. L221-28 3° du Code de la
   * consommation), obligatoire dès qu'un fichier est vendu : sans consentement
   * recueilli AVANT le téléchargement, le client conserve ses 14 jours et peut se
   * faire rembourser un fichier déjà récupéré.
   */
  digital_waiver: z.boolean().optional(),

  // Point relais — obligatoire quand delivery_mode === 'relay' :
  // l'API Boxtal refuse une expédition relais sans pickupPointCode.
  pickup_point_code:        z.string().min(1).max(40).optional(),
  pickup_point_name:        z.string().min(1).max(120).optional(),
  pickup_point_street:      z.string().max(160).optional(),
  pickup_point_city:        z.string().max(80).optional(),
  pickup_point_postal_code: z.string().max(10).optional(),
  locale:        z.enum(['fr', 'en']).default('fr'),
  // Le client envoie le CODE, jamais un montant : la remise est recalculée ici.
  promo_code:    z.string().min(1).max(40).optional(),
  // Adresse — requise uniquement pour la livraison à domicile
  shipping_name:        z.string().min(2).optional(),
  shipping_address:     z.string().min(5).optional(),
  shipping_address2:    z.string().optional(),
  shipping_city:        z.string().min(2).optional(),
  shipping_postal_code: z.string().min(4).max(6).optional(),
  shipping_country:     z.string().length(2).default('FR'),
}).refine(
  // Le relais exige aussi l'adresse : Boxtal veut un toAddress destinataire
  // en plus du point de retrait. Retrait studio et panier numérique en sont exemptés
  // (rien à expédier). La cohérence entre ce mode et le contenu réel du panier est
  // revérifiée côté serveur après lecture des produits — le client ne décide pas.
  (d) => d.delivery_mode === 'pickup' || d.delivery_mode === 'digital' || (
    d.shipping_name && d.shipping_address && d.shipping_city && d.shipping_postal_code
  ),
  { message: 'Adresse de livraison requise pour la livraison à domicile' },
).refine(
  // Sans pickupPointCode, l'étiquette Boxtal sera refusée au moment de l'expédition.
  // On bloque ici plutôt que de laisser une commande payée inexpédiable.
  (d) => d.delivery_mode !== 'relay' || !!d.pickup_point_code,
  { message: 'Point relais requis pour la livraison en point relais' },
).refine(
  // Le téléphone sert au transporteur (avis de passage, SMS du point relais) et au
  // retrait studio (convenir d'un créneau). Sur une commande 100 % fichiers il ne
  // sert à rien : l'exiger coûtait des paniers et collectait une donnée sans
  // finalité. La cohérence entre ce mode et le contenu réel du panier est
  // revérifiée plus bas, après lecture des produits.
  (d) => d.delivery_mode === 'digital' || !!d.phone,
  { message: 'Téléphone requis pour une commande à livrer ou à retirer', path: ['phone'] },
)

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const { ok, retryAfter } = await rateLimit(`shop-checkout:${ip}`, 10, 10 * 60 * 1000)
  if (!ok) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  try {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })

  const d = parsed.data

  // Fusionne les quantités d'une même ligne (sécurité) — une ligne = un produit
  // ET un coloris. Conserve les custom_field_values du 1er item de la ligne.
  const mergedLines = Array.from(mergeCartQuantities(d.items).values())

  // Deux coloris du même objet partagent le produit : un seul stock, un seul
  // prix, une seule ligne Stripe — mais deux lignes de commande à préparer.
  const linesByProduct = new Map<string, MergedCartLine[]>()
  for (const line of mergedLines) {
    const existing = linesByProduct.get(line.product_id)
    if (existing) existing.push(line)
    else linesByProduct.set(line.product_id, [line])
  }

  // Récupère tous les produits en une requête (service_role — bypass RLS)
  const { data: productsRaw, error: productsError } = await supabaseAdmin
    .from('shop_products')
    .select('*')
    .in('id', Array.from(linesByProduct.keys()))
    .eq('active', true)

  if (productsError)
    return NextResponse.json({ error: 'Erreur lors de la récupération des produits' }, { status: 500 })

  const products = (productsRaw ?? []) as ShopProduct[]

  // Vérifie que tous les produits demandés existent et sont disponibles
  if (products.length !== linesByProduct.size)
    return NextResponse.json({ error: 'Un ou plusieurs produits sont introuvables ou indisponibles' }, { status: 404 })

  // Récupère le paramètre livraison offerte globale
  const { data: settingsData } = await supabaseAdmin.from('shop_settings').select('key, value')
  const settingsMap = Object.fromEntries(
    (settingsData ?? []).map((s: { key: string; value: string }) => [s.key, s.value])
  )
  const globalFreeShipping = settingsMap.free_shipping === 'true'

  const lineItems: (
    | { price: string; quantity: number }
    | { price_data: { currency: string; product: string; unit_amount: number }; quantity: number }
    | { price_data: { currency: string; product_data: { name: string; images?: string[] }; unit_amount: number }; quantity: number }
  )[] = []
  const orderItems: {
    product_id: string; product_name: string; quantity: number
    unit_price: number; weight_grams?: number; is_digital?: boolean
    color?: SelectedColor
    custom_field_values?: { key: string; label: string; value: string }[]
  }[] = []
  let subtotal = 0
  // Sous-total physique tenu à part : le port se calcule sur lui seul, et le seuil
  // de gratuité ne doit pas être franchi par des fichiers (rien à expédier).
  let physicalSubtotal = 0
  let digitalCount = 0

  for (const product of products) {
    const lines     = linesByProduct.get(product.id)!
    // Stock, prix et ligne Stripe raisonnent sur le total du produit, tous
    // coloris confondus : c'est la même pièce qui sort du même stock.
    const quantity  = lines.reduce((n, l) => n + l.quantity, 0)
    const unitPrice = product.sale_price ?? product.price
    const digital   = product.product_type === 'digital'

    // Un produit numérique publié sans fichier ne doit pas pouvoir être payé.
    // La contrainte DB l'empêche déjà, ceci couvre les données antérieures.
    if (digital && !product.digital_file_path)
      return NextResponse.json({ error: `« ${product.name} » n'est pas encore disponible au téléchargement` }, { status: 400 })

    if (product.stock !== null && product.stock < quantity)
      return NextResponse.json({ error: `Stock insuffisant pour « ${product.name} » (${product.stock} disponible${product.stock > 1 ? 's' : ''})` }, { status: 409 })

    if (product.sale_price !== null) {
      // Prix promotionnel → price_data inline (pas besoin du stripe_price_id)
      if (product.stripe_product_id) {
        lineItems.push({
          price_data: { currency: 'eur', product: product.stripe_product_id, unit_amount: product.sale_price },
          quantity,
        })
      } else {
        lineItems.push({
          price_data: {
            currency: 'eur',
            product_data: { name: product.name, images: product.images.slice(0, 8) },
            unit_amount: product.sale_price,
          },
          quantity,
        })
      }
    } else {
      if (!product.stripe_price_id)
        return NextResponse.json({ error: `« ${product.name} » n'est pas encore disponible à la vente` }, { status: 400 })
      lineItems.push({ price: product.stripe_price_id, quantity })
    }

    subtotal += unitPrice * quantity
    if (digital) digitalCount += quantity
    else physicalSubtotal += unitPrice * quantity

    for (const line of lines) {
      // Coloris relu dans la palette du produit : le panier ne décide pas de ce
      // qui sera imprimé. Un panier resté en localStorage avant l'ajout des
      // coloris n'en porte aucun, on refuse plutôt que d'imprimer au hasard.
      const color = product.colors?.length
        ? findProductColor(product.colors, line.color)
        : null

      if (product.colors?.length && !color)
        return NextResponse.json(
          { error: `Choisissez un coloris pour « ${product.name} » : rouvrez la fiche produit pour le sélectionner.` },
          { status: 400 },
        )

      // Enrichit les custom_field_values avec les libellés définis sur le produit
      const rawCfv = line.custom_field_values
      const enrichedCfv = rawCfv && product.custom_fields?.length
        ? product.custom_fields
            .filter((f) => rawCfv[f.key] !== undefined)
            .map((f) => ({ key: f.key, label: f.label, value: rawCfv[f.key] }))
        : undefined

      orderItems.push({
        product_id:   product.id,
        product_name: product.name,
        quantity:     line.quantity,
        unit_price:   unitPrice,
        weight_grams: product.weight_grams,
        ...(digital ? { is_digital: true } : {}),
        // Figé sur la commande : la palette du produit peut changer ensuite.
        ...(color ? { color: { key: color.key, label: color.label } } : {}),
        ...(enrichedCfv?.length ? { custom_field_values: enrichedCfv } : {}),
      })
    }
  }

  const hasDigital  = digitalCount > 0
  const hasPhysical = physicalSubtotal > 0 || orderItems.some((i) => !i.is_digital)

  // Le mode de livraison est recalculé à partir du panier réel, jamais accepté tel
  // quel : un client qui annoncerait 'digital' avec un objet dedans obtiendrait une
  // commande payée sans adresse, donc inexpédiable.
  if (hasPhysical && d.delivery_mode === 'digital')
    return NextResponse.json({ error: 'Adresse de livraison requise : le panier contient un article à expédier' }, { status: 400 })

  const deliveryMode = hasPhysical ? d.delivery_mode : 'digital'

  // Consentement L221-28 obligatoire dès qu'un fichier est vendu.
  if (hasDigital && d.digital_waiver !== true)
    return NextResponse.json(
      { error: 'Le renoncement au droit de rétractation est obligatoire pour les fichiers numériques' },
      { status: 400 },
    )

  const isPickup  = deliveryMode === 'pickup'
  const isRelay   = deliveryMode === 'relay'
  const isDigital = deliveryMode === 'digital'
  // Port sur la part physique uniquement.
  const baseShipping = globalFreeShipping ? 0 : calcShopShipping(physicalSubtotal, deliveryMode)

  // Vérifie la promo newsletter (-10% sur le sous-total, frais de port inchangés)
  const { data: newsletterSub } = await supabaseAdmin
    .from('newsletter_subscriptions')
    .select('id')
    .eq('email', d.email)
    .eq('promo_used', false)
    .maybeSingle()

  // ── Code promo ────────────────────────────────────────────────────────────
  // Revalidé intégralement ici : l'aperçu de /api/boutique/promo n'engage rien,
  // et le panier a pu changer entre-temps.
  let appliedPromo: PromoCode | null = null
  let promoDiscount = 0
  let promoFreeShipping = false

  if (d.promo_code) {
    const { data: promoRow } = await supabaseAdmin
      .from('promo_codes')
      .select('*')
      .eq('code', normalizeCode(d.promo_code))
      .maybeSingle()

    const outcome = checkPromo(promoRow as PromoCode | null, {
      subtotal,
      physicalSubtotal,
      digitalSubtotal: subtotal - physicalSubtotal,
      hasPhysical,
    })

    // Refus explicite plutôt que remise silencieusement ignorée : un client qui a
    // saisi un code doit savoir qu'il ne s'applique pas, avant de payer.
    if (!outcome.ok)
      return NextResponse.json(
        { error: 'Ce code promo ne peut pas être appliqué', promo_reason: outcome.reason },
        { status: 400 },
      )

    appliedPromo      = promoRow as PromoCode
    promoDiscount     = outcome.discount
    promoFreeShipping = outcome.freeShipping
  }

  // Un code en pourcentage ou en montant remplace la remise newsletter (jamais
  // deux remises sur le même sous-total) ; « livraison offerte » se cumule.
  const useNewsletter = newsletterSub !== null
    && !(appliedPromo !== null && promoReplacesNewsletter(appliedPromo))

  const newsletterDiscount = useNewsletter ? computeNewsletterDiscount(subtotal) : 0
  const discountAmount     = newsletterDiscount + promoDiscount
  const shipping           = promoFreeShipping ? 0 : baseShipping
  const total              = subtotal - discountAmount + shipping

  // Crée la commande en base
  const { data: order, error: dbError } = await supabaseAdmin
    .from('shop_orders')
    .insert({
      email:                d.email,
      name:                 d.name,
      phone:                d.phone ?? null,
      recovery_token:       d.recovery_token ?? null,
      items:                orderItems,
      subtotal,
      discount_amount:      discountAmount,
      promo_code:           appliedPromo?.code ?? null,
      shipping,
      total_amount:         total,
      status:               'pending_payment',
      delivery_mode:        deliveryMode,
      has_digital:          hasDigital,
      has_physical:         hasPhysical,
      // Horodaté ici et pas à la livraison du fichier : c'est le moment où le client
      // a effectivement donné son accord, et c'est cette date qui fait preuve.
      digital_waiver_at:    hasDigital ? new Date().toISOString() : null,
      pickup_point_code:        isRelay ? (d.pickup_point_code ?? null) : null,
      pickup_point_name:        isRelay ? (d.pickup_point_name ?? null) : null,
      pickup_point_street:      isRelay ? (d.pickup_point_street ?? null) : null,
      pickup_point_city:        isRelay ? (d.pickup_point_city ?? null) : null,
      pickup_point_postal_code: isRelay ? (d.pickup_point_postal_code ?? null) : null,
      locale:               d.locale,
      // Aucune adresse stockée sur une commande sans colis : la conserver serait une
      // donnée personnelle collectée sans finalité.
      shipping_name:        isPickup || isDigital ? null : (d.shipping_name ?? null),
      shipping_address:     isPickup || isDigital ? null : (d.shipping_address ?? null),
      shipping_address2:    isPickup || isDigital ? null : (d.shipping_address2 ?? null),
      shipping_city:        isPickup || isDigital ? null : (d.shipping_city ?? null),
      shipping_postal_code: isPickup || isDigital ? null : (d.shipping_postal_code ?? null),
      shipping_country:     d.shipping_country,
    })
    .select()
    .single()

  if (dbError || !order) {
    console.error('[checkout] DB insert error:', JSON.stringify(dbError))
    return NextResponse.json({ error: 'Erreur lors de la création de la commande' }, { status: 500 })
  }

  // Consommation du code promo : c'est la base qui tranche, elle seule peut le
  // faire sans course entre deux paiements simultanés sur le dernier usage.
  if (appliedPromo) {
    const { data: redeemed, error: redeemError } = await supabaseAdmin.rpc('redeem_promo_code', {
      p_code:     appliedPromo.code,
      p_email:    d.email,
      p_order_id: order.id,
      p_amount:   promoDiscount,
    })

    const result = redeemed?.[0]
    if (redeemError || !result?.ok) {
      // Le code vient d'être épuisé (ou déjà utilisé par cet email) : la commande
      // n'existe que depuis quelques millisecondes et aucune session Stripe n'a
      // été créée — on la retire plutôt que de laisser une commande au mauvais prix.
      await supabaseAdmin.from('shop_orders').delete().eq('id', order.id).eq('status', 'pending_payment')
      return NextResponse.json(
        { error: 'Ce code promo ne peut pas être appliqué', promo_reason: result?.reason ?? 'introuvable' },
        { status: 409 },
      )
    }
  }

  // Consommée APRÈS le code promo, et pas avant : si la consommation du code
  // échoue on abandonne la commande, et le client aurait alors perdu ses −10 %
  // sans rien obtenir en échange (cas d'un code livraison gratuite, cumulable,
  // épuisé entre l'aperçu et le paiement).
  if (useNewsletter && newsletterSub) {
    await supabaseAdmin
      .from('newsletter_subscriptions')
      .update({ promo_used: true })
      .eq('id', newsletterSub.id)
  }

  // Coupon Stripe one-shot — au plus un par session (Stripe n'en accepte pas deux).
  // « Livraison offerte » n'en crée aucun : il agit sur shipping_options.
  let stripeDiscounts: { coupon: string }[] = []
  if (useNewsletter) {
    const coupon = await stripe.coupons.create({
      percent_off: 10,
      duration: 'once',
      name: 'Newsletter −10%',
      metadata: { source: 'newsletter', email: d.email, shop_order_id: order.id },
    })
    stripeDiscounts = [{ coupon: coupon.id }]
  } else if (appliedPromo && promoDiscount > 0) {
    // `amount_off` et pas `percent_off` même pour un pourcentage : Stripe
    // arrondirait de son côté, et le montant débité pourrait différer d'un
    // centime du total enregistré en base (donc de la facture).
    const coupon = await stripe.coupons.create({
      amount_off: promoDiscount,
      currency:   'eur',
      duration:   'once',
      name:       `Code ${appliedPromo.code}`,
      metadata:   { source: 'promo_code', code: appliedPromo.code, shop_order_id: order.id },
    })
    stripeDiscounts = [{ coupon: coupon.id }]
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'
  const isEn   = d.locale === 'en'
  const prefix = isEn ? '/en' : ''

  // Textes affichés sur la page de paiement Stripe — localisés selon la langue du client.
  const tx = {
    pickupRate:   isEn ? 'Studio pickup (free)' : 'Retrait en studio (gratuit)',
    freeShipping: isEn ? 'Free delivery' : 'Livraison offerte',
    trackedShip:  isEn ? 'Tracked delivery' : 'Livraison suivie',
    relayRate:    isEn ? 'Pickup point delivery' : 'Livraison en point relais',
    relayMsg:     isEn
      ? 'Your parcel will be delivered to the pickup point you selected. Estimated time: 3 to 7 business days.'
      : 'Votre colis sera livré au point relais que vous avez choisi. Délai indicatif : 3 à 7 jours ouvrés.',
    pickupMsg:    isEn
      ? 'Studio pickup in Belleville-en-Beaujolais. We will contact you to arrange a time.'
      : 'Retrait en studio à Belleville-en-Beaujolais. Nous vous contacterons pour convenir d\'un créneau.',
    deliveryMsg:  isEn
      ? 'Your order is handmade in our studio. Estimated time: 3 to 7 business days.'
      : 'Votre commande est préparée à la main dans nos studios. Délai indicatif : 3 à 7 jours ouvrés.',
    digitalMsg:   isEn
      ? 'Your download links are available immediately after payment, and are also sent by email.'
      : 'Vos liens de téléchargement sont disponibles immédiatement après le paiement, et vous sont aussi envoyés par email.',
  }

  const session = await stripe.checkout.sessions.create({
    mode:           'payment',
    locale:         isEn ? 'en' : 'fr',
    submit_type:    'pay',
    customer_email: d.email,
    line_items:     lineItems,
    ...(stripeDiscounts.length > 0 ? { discounts: stripeDiscounts } : {}),
    ...(isPickup || isDigital ? {} : {
      payment_intent_data: {
        shipping: {
          name: d.shipping_name!,
          address: {
            line1:       d.shipping_address!,
            line2:       d.shipping_address2 || '',
            city:        d.shipping_city!,
            postal_code: d.shipping_postal_code!,
            country:     d.shipping_country,
          },
        },
      },
    }),
    // Aucune ligne de livraison sur une commande 100 % numérique : afficher
    // « Livraison offerte » à 0 € pour un fichier n'aurait pas de sens.
    ...(isDigital ? {} : {
      shipping_options: isPickup
        ? [
            {
              shipping_rate_data: {
                type:         'fixed_amount' as const,
                fixed_amount: { amount: 0, currency: 'eur' },
                display_name: tx.pickupRate,
              },
            },
          ]
        : [
            {
              shipping_rate_data: {
                type:           'fixed_amount' as const,
                fixed_amount:   { amount: shipping, currency: 'eur' },
                display_name:   shipping === 0
                  ? tx.freeShipping
                  : isRelay ? tx.relayRate : tx.trackedShip,
                delivery_estimate: {
                  minimum: { unit: 'business_day' as const, value: 3 },
                  maximum: { unit: 'business_day' as const, value: 7 },
                },
              },
            },
          ],
    }),
    custom_text: {
      submit: {
        message: isDigital ? tx.digitalMsg : isPickup ? tx.pickupMsg : isRelay ? tx.relayMsg : tx.deliveryMsg,
      },
    },
    success_url: `${appUrl}${prefix}/boutique/suivi/${order.id}?payment=success`,
    cancel_url:  `${appUrl}${prefix}/boutique?cancelled=true`,
    // Expire après 30 min (minimum Stripe) — au-delà, checkout.session.expired
    // nettoie la commande fantôme et libère la promo newsletter (cf. webhook).
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    metadata: {
      shop_order_id: order.id,
      type:          'shop_order',
      ...(useNewsletter ? { newsletter_promo_email: d.email } : {}),
      ...(appliedPromo ? { promo_code: appliedPromo.code } : {}),
    },
  })

  await supabaseAdmin
    .from('shop_orders')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', order.id)

  return NextResponse.json({ checkout_url: session.url, order_id: order.id })

  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[checkout] Erreur non gérée:', detail)
    await sendCriticalAlert('Checkout boutique — erreur non gérée', {
      erreur: detail,
      consequence: 'Un client n\'a pas pu payer — vérifier Stripe/Supabase',
    })
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
