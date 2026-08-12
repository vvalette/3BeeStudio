import { ImageResponse } from 'next/og'

// Image OG par défaut (1200×630) générée à la volée, aux couleurs de la marque.
// S'applique à toutes les pages sous /[locale]. Une page peut la surcharger
// en ajoutant son propre opengraph-image.

export const alt = "3BeeStudio — Studio d'impression 3D français"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          // Satori ne parse pas le raccourci `background` mêlant dégradé + couleur :
          // les deux propriétés doivent rester séparées.
          backgroundColor: '#0A0A0B',
          backgroundImage:
            'radial-gradient(ellipse at 70% 0%, rgba(245,158,11,0.20), transparent 55%)',
          color: '#FAFAFA',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: 34,
            fontWeight: 700,
            color: '#FBBF24',
          }}
        >
          🐝 3BeeStudio
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            maxWidth: 900,
          }}
        >
          Porte-clés NFC personnalisés & impression 3D sur-mesure
        </div>
        <div style={{ marginTop: 28, fontSize: 30, color: '#A1A1AA' }}>
          Fabriqué en France · De votre imagination à vos mains
        </div>
      </div>
    ),
    { ...size },
  )
}
