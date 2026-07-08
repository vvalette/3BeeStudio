// Couleurs du porte-clé par thème, partagées entre le rendu 3D (WebGL)
// et le badge 2D de secours (CSS/SVG) affiché quand la 3D est indisponible.
// Le duo s'inverse pour contraster avec la carte crème :
// sombre = corps ambre / logo noir · clair = corps anthracite / logo ambre
export const KEYCHAIN_COLORS = {
  dark:  { body: '#F59E0B', logo: '#111111' },
  light: { body: '#18181C', logo: '#F59E0B' },
} as const

export type KeychainThemeKey = keyof typeof KEYCHAIN_COLORS
