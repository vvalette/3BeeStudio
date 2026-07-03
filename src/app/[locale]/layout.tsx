import type { Metadata, Viewport } from 'next'
import { Manrope, JetBrains_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import ThemeProvider from '@/components/layout/ThemeProvider'
import CartProvider from '@/components/boutique/CartProvider'
import CartDrawer from '@/components/boutique/CartDrawer'
import { routing } from '@/i18n/routing'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import '@/styles/globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-manrope',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-jetbrains',
})

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: '3BeeStudio.fr',
    template: '%s · 3BeeStudio.fr',
  },
  description:
    "Studio d'impression 3D français. Porte-clés NFC personnalisés B2B, objets de série et créations sur-mesure. De votre imagination à vos mains.",
  applicationName: '3BeeStudio',
  authors: [{ name: '3BeeStudio' }],
  keywords: ['impression 3D', 'porte-clés NFC', 'NFC B2B', 'objets personnalisés', 'sur-mesure', 'studio 3D français'],
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: siteUrl,
    siteName: '3BeeStudio',
    title: "3BeeStudio — Studio d'impression 3D français",
    description: 'Porte-clés NFC personnalisés, objets de série et créations sur-mesure imprimés en France.',
  },
  twitter: {
    card: 'summary_large_image',
    title: '3BeeStudio',
    description: "Studio d'impression 3D français — NFC B2B, série et sur-mesure.",
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  // Thème clair par défaut (pas de suivi OS) — statique pour rester cohérent avec le reste du site.
  themeColor: '#FFFFFF',
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
}

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound()
  }

  // Rendu statique : sans cet appel, next-intl lit les headers de la requête
  // et force TOUTES les pages [locale] en dynamique (aucun cache CDN).
  setRequestLocale(locale)

  const allMessages = await getMessages()

  // N'envoie au client que les namespaces réellement consommés par des composants 'use client'
  // (navbar, panier, formulaires NFC/sur-mesure/boutique…). Le reste (pages légales, sections
  // landing statiques, pages de suivi…) est rendu côté serveur via useTranslations/getTranslations
  // en RSC et n'a jamais besoin du provider client — ~55% de payload i18n en moins.
  const CLIENT_NAMESPACES = [
    'nav', 'footer', 'boutique', 'common', 'newsletter', 'nfcSection', 'nfcForm', 'nfcLink', 'surMesureForm',
  ] as const
  const messages = Object.fromEntries(
    CLIENT_NAMESPACES.filter((ns) => ns in allMessages).map((ns) => [ns, allMessages[ns]])
  )

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${manrope.variable} ${jetbrains.variable} overflow-x-hidden`}
    >
      <body className="font-sans antialiased">
        <ThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <CartProvider>
              <Navbar showLocaleSwitcher />
              <main className="pt-[72px]">{children}</main>
              <CartDrawer />
            </CartProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
