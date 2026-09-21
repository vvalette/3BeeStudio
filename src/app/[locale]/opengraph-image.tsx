import { ImageResponse } from 'next/og'
import { getTranslations } from 'next-intl/server'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Locale } from '@/i18n/routing'

/**
 * Image de partage par défaut (1200×630) : le premier visuel que voit quelqu'un
 * à qui on envoie « 3beestudio.fr » dans une conversation ou sur un réseau.
 *
 * Elle rejoue le hero du site tel qu'il est aujourd'hui — fond clair, trame
 * hexagonale ambrée, halo miel, logo à droite — plutôt qu'une plaque sombre qui
 * ne ressemblait plus à la page qu'on ouvre derrière le lien.
 *
 * Le texte vient des mêmes clés que le hero (`messages/*.json`, namespace
 * `hero`) : une retouche de la baseline sur le site suit dans l'aperçu, sans
 * copie à maintenir en double ici.
 *
 * Rendue par Satori, qui n'est pas un navigateur :
 *  - tout conteneur à plusieurs enfants déclare `display: flex` ;
 *  - `background` ne mêle jamais dégradé et couleur (propriétés séparées) ;
 *  - ni `<br>` ni `background-clip: text` : les retours ligne sont des blocs et
 *    le mot « miel » est une couleur pleine ;
 *  - ni WOFF2 : Manrope est récupérée en TTF (voir `manropeFont`).
 *
 * S'applique à toutes les pages sous /[locale]. Une page peut la surcharger en
 * ajoutant son propre opengraph-image (voir `boutique/[slug]`).
 */

export const alt = "3BeeStudio · Studio d'impression 3D français"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Palette claire du site (src/styles/globals.css, bloc `:root`).
const BG         = '#FAFAF8' // --bg-1
const INK_0      = '#17171A'
const INK_1      = '#3F3F46'
const INK_2      = '#6B6B73'
const AMBER      = '#F59E0B'
const AMBER_DEEP = '#B45309'
const AMBER_MID  = '#D97706' // cœur du dégradé « miel », lisible sur fond clair
const LINE       = 'rgba(0,0,0,0.08)'

/** Trame hexagonale du hero (`Hero.tsx`), en tuile répétée. */
const HEX_TILE = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="56" viewBox="0 0 48 56">` +
    `<path d="M24 1 L46 13 L46 39 L24 51 L2 39 L2 13 Z" fill="none" stroke="rgba(245,158,11,0.14)" stroke-width="0.7"/>` +
  `</svg>`,
)}`

/**
 * Manrope en TTF, la police du site.
 *
 * L'API `css2` de Google sert du WOFF2 aux navigateurs modernes, que Satori ne
 * sait pas décoder : sans en-tête `User-Agent` reconnu, elle retombe sur du
 * TrueType, seul format exploitable ici.
 *
 * `null` si quoi que ce soit échoue : l'aperçu part alors avec la police par
 * défaut de Satori, ce qui vaut mieux qu'une image qui ne se génère pas (ou,
 * au build, qu'un déploiement qui casse).
 */
async function manropeFont(weight: 400 | 700 | 800): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Manrope:wght@${weight}`,
    ).then((r) => (r.ok ? r.text() : ''))
    const url = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/)?.[1]
    if (!url) return null
    const res = await fetch(url)
    return res.ok ? await res.arrayBuffer() : null
  } catch {
    return null
  }
}

/**
 * Logo lu sur le disque plutôt que par son URL publique : l'image est générée
 * au build, quand le site n'est pas encore en ligne pour se répondre à lui-même.
 */
async function logoData(): Promise<string | null> {
  try {
    const bytes = await readFile(join(process.cwd(), 'public', 'images', 'logo.png'))
    return `data:image/png;base64,${bytes.toString('base64')}`
  } catch {
    return null
  }
}

/**
 * Découpe le titre du hero (`Impression <honey>3D</honey>,<br></br>imaginée…`)
 * en lignes de segments, le segment « miel » portant l'ambre.
 *
 * Les espaces sont conservés tels quels (`whiteSpace: 'pre'` au rendu) : en
 * flex, « Impression » et « 3D » sont deux boîtes voisines, et une espace
 * rognée collerait les deux mots.
 */
function headingLines(raw: string): { text: string; honey: boolean }[][] {
  return raw
    .split(/<br\s*\/?>(?:<\/br>)?/)
    .map((line) =>
      line
        .split(/<honey>|<\/honey>/)
        .map((text, i) => ({ text, honey: i % 2 === 1 }))
        .filter((seg) => seg.text.length > 0),
    )
    .filter((line) => line.length > 0)
}

export default async function OpengraphImage({ params }: { params: { locale: Locale } }) {
  const { locale } = params
  const t = await getTranslations({ locale, namespace: 'hero' })

  const [regular, bold, extrabold, logo] = await Promise.all([
    manropeFont(400),
    manropeFont(700),
    manropeFont(800),
    logoData(),
  ])

  const lines = headingLines(t.raw('heading') as string)
  const trust = [t('trust.france'), t('trust.payment'), t('trust.delivery')].join('  ·  ')

  const fonts = [
    regular   && { name: 'Manrope', data: regular,   weight: 400 as const, style: 'normal' as const },
    bold      && { name: 'Manrope', data: bold,      weight: 700 as const, style: 'normal' as const },
    extrabold && { name: 'Manrope', data: extrabold, weight: 800 as const, style: 'normal' as const },
  ].filter((f): f is NonNullable<typeof f> => Boolean(f))

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          backgroundColor: BG,
          color: INK_0,
          fontFamily: fonts.length ? 'Manrope' : 'sans-serif',
        }}
      >
        {/* Trame hexagonale — même motif que le hero, en fond de carte */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            backgroundImage: `url("${HEX_TILE}")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '48px 56px',
          }}
        />

        {/* Halo miel — le même dégradé que `.hex-bg` et le glow du hero */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            backgroundImage:
              'radial-gradient(circle at 78% 40%, rgba(245,158,11,0.22), transparent 58%), ' +
              'radial-gradient(circle at 12% 8%, rgba(245,158,11,0.12), transparent 46%)',
          }}
        />

        {/* ─── Colonne gauche : la copie du hero ─── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            width: 700,
            height: '100%',
            padding: '0 0 0 72px',
          }}
        >
          {/* Eyebrow — pastille ambrée + libellé, comme <Eyebrow /> */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', width: 9, height: 9, borderRadius: 999, backgroundColor: AMBER }} />
            <div
              style={{
                display: 'flex',
                fontSize: 19,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: AMBER_DEEP,
              }}
            >
              {t('eyebrow')}
            </div>
          </div>

          {/* Titre — une ligne = un bloc, le mot « miel » en ambre */}
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 30 }}>
            {lines.map((segments, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline' }}>
                {segments.map((seg, j) => (
                  <div
                    key={j}
                    style={{
                      display: 'flex',
                      whiteSpace: 'pre',
                      fontSize: 66,
                      fontWeight: 800,
                      lineHeight: 1.06,
                      letterSpacing: '-0.04em',
                      color: seg.honey ? AMBER_MID : INK_0,
                    }}
                  >
                    {seg.text}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              marginTop: 26,
              maxWidth: 560,
              fontSize: 26,
              lineHeight: 1.4,
              color: INK_1,
            }}
          >
            {t('subtitle')}
          </div>

          {/* Bandeau de réassurance — le pavé « glass » du hero */}
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              marginTop: 34,
              padding: '14px 22px',
              borderRadius: 20,
              border: `1px solid ${LINE}`,
              backgroundColor: 'rgba(255,255,255,0.70)',
              fontSize: 20,
              fontWeight: 500,
              color: INK_2,
            }}
          >
            {trust}
          </div>
        </div>

        {/* ─── Colonne droite : le logo dans ses anneaux ─── */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flex: 1,
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              display: 'flex',
              width: 420,
              height: 420,
              borderRadius: 999,
              border: '1px solid rgba(245,158,11,0.30)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              display: 'flex',
              width: 320,
              height: 320,
              borderRadius: 999,
              border: `1px solid ${LINE}`,
            }}
          />
          {logo && (
            <img
              src={logo}
              alt=""
              width={360}
              height={360}
              style={{ width: 360, height: 360, objectFit: 'contain' }}
            />
          )}
        </div>

        {/* Domaine — ce qu'on tape après avoir vu la carte */}
        <div
          style={{
            position: 'absolute',
            right: 56,
            bottom: 40,
            display: 'flex',
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '0.02em',
            color: AMBER_DEEP,
          }}
        >
          3beestudio.fr
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  )
}
