import { supabase } from '@/lib/supabase'
import type { ShopProduct } from '@/types/shop-product'
import type { Metadata } from 'next'
import BoutiqueProductCard from '@/components/boutique/BoutiqueProductCard'

export const metadata: Metadata = {
  title: 'Boutique — 3BeeStudio',
  description: 'Objets imprimés en 3D à la main dans nos studios français. Décoration, accessoires, pièces uniques.',
}

export const revalidate = 60

export default async function BoutiquePage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>
}) {
  const { cancelled } = await searchParams

  const { data } = await supabase
    .from('shop_products')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })

  const products = (data ?? []) as ShopProduct[]

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-8 pb-16">
      <div className="mx-auto max-w-5xl">

        {/* En-tête */}
        <header className="mb-10 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber">3BeeStudio · Boutique</p>
          <h1 className="mt-3 font-extrabold text-ink-0" style={{ fontSize: 'clamp(2rem, 6vw, 3rem)', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            Impressions 3D
          </h1>
          <p className="mt-3 text-base text-ink-2 max-w-md mx-auto">
            Chaque pièce est imprimée à la main dans nos studios français. Livraison sous 3 à 7 jours ouvrés.
          </p>
        </header>

        {/* Bannière annulation */}
        {cancelled === 'true' && (
          <div className="mb-6 rounded-xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber text-center">
            Paiement annulé — votre panier a été conservé.
          </div>
        )}

        {/* Grille produits */}
        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] py-24 text-center">
            <p className="text-ink-3">Les produits arrivent bientôt…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <BoutiqueProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
