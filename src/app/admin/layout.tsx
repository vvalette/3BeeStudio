import { Manrope, JetBrains_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import Navbar from '@/components/layout/Navbar'
import ThemeProvider from '@/components/layout/ThemeProvider'
import AdminNav from '@/components/admin/AdminNav'
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${manrope.variable} ${jetbrains.variable} overflow-x-hidden`}>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <NextIntlClientProvider locale="fr" messages={frMessages}>
            <Navbar showLocaleSwitcher={false} showCart={false} />
            <main className="pt-[72px]">
              <AdminNav />
              {children}
            </main>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
