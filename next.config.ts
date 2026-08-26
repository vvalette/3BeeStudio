import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  // NEXT_BUILD_DIR permet de lancer `next build` dans un dossier séparé
  // sans conflit avec le serveur `next dev` qui utilise .next en parallèle.
  distDir: process.env.NEXT_BUILD_DIR ?? '.next',
  images: {
    // Vercel facture une transformation (et une écriture de cache) à chaque MISS et à
    // chaque STALE, pas une seule fois par image. Pour une image distante le TTL retenu
    // est max(Cache-Control amont, minimumCacheTTL) : Supabase Storage renvoie
    // max-age=3600, donc chaque variante repartait en transformation toutes les heures.
    // 31 jours = le plafond du cache CDN Vercel. Aucun risque de servir du périmé : les
    // uploads produits ont un nom unique (Date.now()-random, upsert: false), remplacer
    // une image crée une nouvelle URL donc une nouvelle clé de cache.
    minimumCacheTTL: 2678400,
    // Chaque largeur distincte est une transformation distincte. Audience mobile-first :
    // 3840 ne servait qu'aux écrans 4K, pour les transformations les plus lourdes.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.tiktokcdn.com',
      },
      {
        protocol: 'https',
        hostname: '*.tiktokcdn-us.com',
      },
      {
        protocol: 'https',
        hostname: '*.tiktokcdn-eu.com',
      },
    ],
  },
  // Routes typées : les Link/router next (admin, 404) sont vérifiés à la compilation.
  // Les liens publics passent par @/i18n/navigation (non concernés par ce typage).
  typedRoutes: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
