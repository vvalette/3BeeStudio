// Namespaces de traduction poussés au NextIntlClientProvider (voir app/[locale]/layout.tsx).
// N'envoyer que ceux réellement consommés par des composants 'use client' (navbar, panier,
// formulaires NFC/sur-mesure/boutique…) : le reste (pages légales, sections landing, pages
// de suivi…) est rendu en RSC et n'a jamais besoin du provider, ~55 % de payload i18n en moins.
//
// Un composant client qui lit un namespace absent de cette liste n'échoue pas visiblement :
// il affiche la clé brute au visiteur. client-namespaces.test.ts verrouille la règle.
export const CLIENT_NAMESPACES = [
  'nav', 'footer', 'boutique', 'common', 'newsletter', 'nfcSection', 'nfcForm', 'nfcLink', 'surMesureForm',
  'errorPages', 'contactPage',
] as const
