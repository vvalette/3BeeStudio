import { ImageResponse } from 'next/og'
import { supabase } from '@/lib/supabase'
import { effectivePrice } from '@/types/shop-product'
import type { Locale } from '@/i18n/routing'

/**
 * Image de partage (1200×630) propre à chaque fiche produit.
 *
 * Sans elle, tous les liens produit remontaient l'image OG générique de
 * `[locale]/opengraph-image.tsx` : un lien collé en bio TikTok, en story ou dans
 * une conversation WhatsApp ne montrait pas l'objet vendu. C'est le premier
 * visuel que voit quelqu'un qui reçoit le lien, avant même d'ouvrir la page.
 *
 * Rendue par Satori, qui n'est pas un navigateur : chaque conteneur à plusieurs
 * enfants déclare `display: flex`, et `background` ne mélange jamais dégradé et
 * couleur (les deux propriétés restent séparées).
 */

export const alt = 'Fiche produit 3BeeStudio'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Même cadence que la fiche produit : l'image suit un changement de prix ou de
// photo au plus tard dans l'heure, sans être régénérée à chaque partage.
export const revalidate = 3600

/** Panneau visuel de gauche, en pixels. */
const PANEL_W = 520
const PANEL_H = 630

/**
 * Rapatrie la photo produit sous une forme que Satori sait décoder.
 *
 * Satori ne gère ni WebP ni AVIF, or l'admin accepte les deux et la majorité des
 * photos du catalogue sont en WebP : passer l'URL telle quelle laissait un
 * panneau vide, sans la moindre erreur. On passe donc par la transformation
 * d'image de Supabase Storage, qui renvoie du JPEG dès qu'on le demande dans
 * `Accept`, et qui redimensionne au passage à la taille exacte du panneau.
 *
 * Le résultat est inliné en data URI plutôt que confié au fetch interne de
 * Satori : lui n'envoie pas d'en-tête `Accept`, et Supabase lui rendrait du WebP.
 *
 * `null` en cas d'échec : la plaque de marque prend le relais, une carte de
 * partage sans photo restant préférable à une image qui ne se génère pas.
 */
async function productImageData(url: string): Promise<string | null> {
  let target = url
  if (url.includes('/storage/v1/object/public/')) {
    const render = new URL(url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/'))
    render.searchParams.set('width',  String(PANEL_W))
    render.searchParams.set('height', String(PANEL_H))
    render.searchParams.set('resize', 'cover')
    target = render.toString()
  }

  try {
    const res = await fetch(target, { headers: { Accept: 'image/jpeg' } })
    if (!res.ok) return null
    const type = res.headers.get('content-type') ?? ''
    // Une transformation désactivée renverrait le WebP d'origine : mieux vaut la
    // plaque de marque qu'un panneau vide.
    if (!/^image\/(jpeg|png|gif|svg\+xml)$/.test(type)) return null
    const bytes = Buffer.from(await res.arrayBuffer())
    return `data:${type};base64,${bytes.toString('base64')}`
  } catch {
    return null
  }
}

const BG      = '#0A0A0B'
const CARD    = '#141416'
const INK     = '#FAFAFA'
const INK_DIM = '#A1A1AA'
const AMBER   = '#FBBF24'
const LINE    = '#26262B'

export default async function ProductOpengraphImage({
  params,
}: {
  params: { slug: string; locale: Locale }
}) {
  const { slug, locale } = params
  const isEn = locale === 'en'

  const { data } = await supabase
    .from('shop_products')
    .select('name, name_en, subtitle, subtitle_en, price, sale_price, images, product_type')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle()

  const name     = data ? ((isEn && data.name_en) ? data.name_en : data.name) : '3BeeStudio'
  const subtitle = data ? ((isEn && data.subtitle_en) ? data.subtitle_en : data.subtitle) : null
  const digital  = data?.product_type === 'digital'
  const source   = data?.images?.[0] ?? null
  const image    = source ? await productImageData(source) : null

  const price = data
    ? new Intl.NumberFormat(isEn ? 'en-GB' : 'fr-FR', {
        style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
      }).format(effectivePrice({ price: data.price, sale_price: data.sale_price }) / 100)
    : null

  const onSale = data?.sale_price !== null && data?.sale_price !== undefined

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: BG,
          backgroundImage: 'radial-gradient(ellipse at 80% 0%, rgba(245,158,11,0.18), transparent 55%)',
          color: INK,
          fontFamily: 'sans-serif',
        }}
      >
        {/* Visuel produit — moitié gauche */}
        <div
          style={{
            width: PANEL_W,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: CARD,
            borderRight: `1px solid ${LINE}`,
          }}
        >
          {image ? (
            <img
              src={image}
              alt=""
              width={PANEL_W}
              height={PANEL_H}
              style={{ width: PANEL_W, height: PANEL_H, objectFit: 'cover' }}
            />
          ) : (
            // Produit sans photo (un fichier 3D n'en a pas toujours) : on garde
            // une plaque de marque plutôt qu'un trou noir dans l'aperçu.
            <div style={{ display: 'flex', fontSize: 150 }}>🐝</div>
          )}
        </div>

        {/* Texte — moitié droite */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '64px 56px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 26, fontWeight: 700, color: AMBER }}>
            🐝 3BeeStudio
          </div>

          <div
            style={{
              marginTop: 24,
              fontSize: name.length > 34 ? 52 : 62,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              display: 'flex',
            }}
          >
            {name}
          </div>

          {subtitle && (
            <div style={{ marginTop: 18, fontSize: 26, color: INK_DIM, lineHeight: 1.3, display: 'flex' }}>
              {subtitle}
            </div>
          )}

          {price && (
            <div style={{ marginTop: 34, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', fontSize: 46, fontWeight: 800, color: AMBER }}>{price}</div>
              {onSale && (
                <div
                  style={{
                    display: 'flex',
                    fontSize: 22,
                    fontWeight: 700,
                    color: '#FCA5A5',
                    border: '1px solid #7F1D1D',
                    borderRadius: 999,
                    padding: '6px 16px',
                  }}
                >
                  {isEn ? 'Sale' : 'Promo'}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 28, fontSize: 22, color: INK_DIM, display: 'flex' }}>
            {digital
              ? (isEn ? 'Instant 3D file download' : 'Fichier 3D à télécharger')
              : (isEn ? 'Designed and 3D printed in France' : 'Imprimé en 3D en France')}
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
