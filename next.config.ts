import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  // NEXT_BUILD_DIR permet de lancer `next build` dans un dossier séparé
  // sans conflit avec le serveur `next dev` qui utilise .next en parallèle.
  distDir: process.env.NEXT_BUILD_DIR ?? '.next',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // typedRoutes désactivé le temps de migrer tous les Link vers @/i18n/navigation
  // typedRoutes: true,
}

export default withNextIntl(nextConfig)
