'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * Thème clair par défaut, mode sombre activable via le toggle.
 * Pas de suivi de la préférence OS (enableSystem={false}) :
 * tout nouveau visiteur démarre en clair, son choix est mémorisé.
 */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
