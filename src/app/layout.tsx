import type { Metadata, Viewport } from 'next'
import { Manrope, JetBrains_Mono } from 'next/font/google'
import Navbar from '@/components/layout/Navbar'
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
    'Studio d\'impression 3D français. Porte-clés NFC personnalisés B2B, objets de série et créations sur-mesure. De votre imagination à vos mains.',
  applicationName: '3BeeStudio',
  authors: [{ name: '3BeeStudio' }],
  keywords: ['impression 3D', 'porte-clés NFC', 'NFC B2B', 'objets personnalisés', 'sur-mesure', 'studio 3D français'],
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: siteUrl,
    siteName: '3BeeStudio',
    title: '3BeeStudio — Studio d\'impression 3D français',
    description: 'Porte-clés NFC personnalisés, objets de série et créations sur-mesure imprimés en France.',
  },
  twitter: {
    card: 'summary_large_image',
    title: '3BeeStudio',
    description: 'Studio d\'impression 3D français — NFC B2B, série et sur-mesure.',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#0A0A0B',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${manrope.variable} ${jetbrains.variable} overflow-x-hidden`}>
      <body className="bg-bg-0 text-ink-0 font-sans antialiased">
        <Navbar />
        <main className="pt-[72px]">{children}</main>
      </body>
    </html>
  )
}
