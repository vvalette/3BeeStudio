/**
 * Script one-shot : lie les produits Supabase à Stripe Live.
 *
 * Usage :
 *   STRIPE_SECRET_KEY=sk_live_xxx npx tsx scripts/sync-stripe-live.ts
 *
 * - Lit les produits dans Supabase (via .env.local)
 * - Crée un produit + prix Stripe Live pour chaque produit sans ID Live
 * - Met à jour stripe_product_id et stripe_price_id dans Supabase
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripeKey = process.env.STRIPE_SECRET_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!stripeKey) { console.error('❌  STRIPE_SECRET_KEY manquant'); process.exit(1) }
if (!supabaseUrl || !supabaseKey) { console.error('❌  Variables Supabase manquantes dans .env.local'); process.exit(1) }
if (!stripeKey.startsWith('sk_live_')) {
  console.error('❌  La clé Stripe fournie n\'est pas une clé LIVE (doit commencer par sk_live_)')
  console.error('   → Stripe Dashboard → mode Live → Developers → API Keys')
  process.exit(1)
}

const stripe = new Stripe(stripeKey)
const supabase = createClient(supabaseUrl, supabaseKey)

interface ShopProduct {
  id: string
  name: string
  description: string | null
  price: number
  images: string[]
  active: boolean
  stripe_product_id: string | null
  stripe_price_id: string | null
}

async function run() {
  console.log('🔍  Récupération des produits Supabase…')
  const { data: products, error } = await supabase
    .from('shop_products')
    .select('id, name, description, price, images, active, stripe_product_id, stripe_price_id')
    .order('created_at', { ascending: true })

  if (error || !products) {
    console.error('❌  Erreur Supabase :', error?.message)
    process.exit(1)
  }

  console.log(`✅  ${products.length} produit(s) trouvé(s)\n`)

  for (const product of products as ShopProduct[]) {
    const isAlreadyLive =
      product.stripe_product_id?.startsWith('prod_') &&
      !product.stripe_product_id.includes('test')

    if (isAlreadyLive && product.stripe_product_id && product.stripe_price_id) {
      try {
        await stripe.products.retrieve(product.stripe_product_id)
        console.log(`⏭️   ${product.name} — déjà lié (${product.stripe_product_id})`)
        continue
      } catch {
        console.log(`⚠️   ${product.name} — ID Stripe introuvable en Live, recréation…`)
      }
    }

    console.log(`🔄  ${product.name} (${product.price / 100} €)…`)

    // Création du produit Stripe Live
    const stripeProduct = await stripe.products.create({
      name: product.name,
      description: product.description || undefined,
      images: product.images?.length > 0 ? product.images.slice(0, 8) : undefined,
      active: product.active,
      metadata: { source: '3beestudio_boutique', supabase_id: product.id },
    })

    // Création du prix Stripe Live
    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: product.price,
      currency: 'eur',
    })

    // Mise à jour Supabase
    const { error: updateError } = await supabase
      .from('shop_products')
      .update({
        stripe_product_id: stripeProduct.id,
        stripe_price_id:   stripePrice.id,
      })
      .eq('id', product.id)

    if (updateError) {
      console.error(`   ❌  Erreur mise à jour Supabase : ${updateError.message}`)
    } else {
      console.log(`   ✅  ${stripeProduct.id} / ${stripePrice.id}`)
    }
  }

  console.log('\n🚀  Synchronisation terminée !')
  console.log('   → Vérifie dans Stripe Dashboard (mode Live) → Products')
}

run().catch((err) => {
  console.error('❌  Erreur :', err.message)
  process.exit(1)
})
