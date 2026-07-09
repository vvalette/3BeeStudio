'use client'

import { useTheme } from 'next-themes'
import { KEYCHAIN_COLORS } from './keychainColors'

/* Badge 2D — reproduit visuellement le porte-clé 3D (abeille + wordmark)
   en CSS/SVG pur, sans dépendance WebGL. Sert de secours garanti quand
   la scène 3D n'est pas supportée (navigateurs intégrés Instagram/TikTok,
   Data Saver, contexte WebGL refusé...). */
export default function KeychainBadge2D({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme()
  const { body, logo } = KEYCHAIN_COLORS[resolvedTheme === 'dark' ? 'dark' : 'light']

  return (
    <div className={className ?? 'h-[200px] w-[200px]'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        className="relative flex items-center justify-center"
        style={{
          width: '76%',
          height: '76%',
          borderRadius: 22,
          background: body,
          boxShadow: '0 16px 28px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {/* Trou d'attache, coin haut-gauche, comme le vrai porte-clé */}
        <span
          aria-hidden
          className="absolute rounded-full"
          style={{ top: 12, left: 12, width: 10, height: 10, border: '2px solid rgba(255,255,255,0.3)' }}
        />
        {/* Logo (abeille + wordmark) via mask CSS — recolorable, sans dupliquer le tracé SVG */}
        <span
          aria-hidden
          style={{
            width: '58%',
            height: '58%',
            backgroundColor: logo,
            WebkitMaskImage: 'url(/images/3beestudio_logo_mono.svg)',
            maskImage: 'url(/images/3beestudio_logo_mono.svg)',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
          }}
        />
      </div>
    </div>
  )
}
