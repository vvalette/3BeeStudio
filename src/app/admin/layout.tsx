import { Manrope, JetBrains_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import Navbar from '@/components/layout/Navbar'
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
    <html lang="fr" className={`${manrope.variable} ${jetbrains.variable} overflow-x-hidden`}>
      <body className="bg-bg-0 text-ink-0 font-sans antialiased">
        <NextIntlClientProvider locale="fr" messages={frMessages}>
          <Navbar showLocaleSwitcher={false} />
          <main className="pt-[72px]">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
