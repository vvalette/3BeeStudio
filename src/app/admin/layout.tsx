import { Manrope, JetBrains_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import Navbar from '@/components/layout/Navbar'
import ThemeProvider from '@/components/layout/ThemeProvider'
import AdminNav from '@/components/admin/AdminNav'
import { isAuthenticated } from '@/lib/auth'
import frMessages from '../../../messages/fr.json'
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

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // `/admin` sert à la fois d'écran de connexion et de tableau de bord : la nav ne
  // peut plus se cacher sur la seule base de l'URL, elle a besoin de l'état de session.
  const authenticated = await isAuthenticated()

  return (
    <html lang="fr" suppressHydrationWarning className={`${manrope.variable} ${jetbrains.variable} overflow-x-hidden`}>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <NextIntlClientProvider locale="fr" messages={frMessages}>
            <Navbar showLocaleSwitcher={false} showCart={false} />
            <main className="pt-[72px]">
              <AdminNav authenticated={authenticated} />
              {children}
            </main>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
