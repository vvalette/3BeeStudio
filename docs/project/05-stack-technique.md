# 05 — Stack Technique

## Architecture

```
3beestudio.fr/
├── Frontend      Next.js 15 (App Router) + Tailwind CSS v4 + TypeScript
├── Hébergement   Vercel (free tier — déploiement auto depuis GitHub)
├── Paiements     Stripe (checkout série + payment intent sur-mesure/NFC)
├── Emails        Resend (gratuit jusqu'à 3k/mois)
├── Upload        Vercel Blob (fichiers clients sur-mesure)
├── Base données  Supabase (free tier — commandes, clients, produits)
└── Fonts         Google Fonts (Syne + DM Sans)
```

## Initialisation du Projet

```bash
npx create-next-app@latest 3beestudio \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd 3beestudio
```

## Dépendances à Installer

```bash
# Stripe
npm install stripe @stripe/stripe-js @stripe/react-stripe-js

# Emails
npm install resend react-email @react-email/components

# Upload fichiers
npm install @vercel/blob

# Base de données
npm install @supabase/supabase-js

# Formulaires
npm install react-hook-form @hookform/resolvers zod

# UI utilitaires
npm install clsx tailwind-merge lucide-react

# Animations
npm install framer-motion

# Upload drag & drop
npm install react-dropzone
```

## Structure de Fichiers

```
src/
├── app/
│   ├── layout.tsx                    # Root layout (fonts, metadata)
│   ├── page.tsx                      # Accueil
│   ├── nfc/
│   │   └── page.tsx                  # Landing NFC B2B
│   ├── boutique/
│   │   ├── page.tsx                  # Liste produits
│   │   └── [slug]/
│   │       └── page.tsx              # Fiche produit
│   ├── sur-mesure/
│   │   └── page.tsx                  # Formulaire multi-step
│   ├── portfolio/
│   │   └── page.tsx                  # Galerie
│   ├── suivi/
│   │   └── [orderId]/
│   │       └── page.tsx              # Suivi commande
│   ├── cgv/page.tsx
│   ├── mentions-legales/page.tsx
│   └── api/
│       ├── stripe/
│       │   ├── checkout/route.ts     # Stripe Checkout (série)
│       │   └── webhook/route.ts      # Webhook Stripe
│       └── devis/
│           └── route.ts              # Envoi devis (NFC + sur-mesure)
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   ├── home/
│   │   ├── Hero.tsx
│   │   ├── SocialFeed.tsx
│   │   └── ProcessSteps.tsx
│   ├── nfc/
│   │   ├── NfcHero.tsx
│   │   ├── NfcMockup.tsx             # Mockup animé porte-clé
│   │   ├── NfcRedirectSelector.tsx
│   │   ├── NfcPricingGrid.tsx
│   │   └── NfcDevisForm.tsx          # Formulaire multi-step NFC
│   ├── boutique/
│   │   ├── ProductGrid.tsx
│   │   └── ProductCard.tsx
│   ├── sur-mesure/
│   │   ├── MultiStepForm.tsx
│   │   └── UploadZone.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Badge.tsx
│       ├── Card.tsx
│       └── Input.tsx
├── lib/
│   ├── stripe.ts                     # Config Stripe client + server
│   ├── supabase.ts                   # Client Supabase
│   ├── resend.ts                     # Config Resend emails
│   └── utils.ts                     # cn(), formatPrice(), etc.
├── types/
│   ├── product.ts
│   ├── order.ts
│   └── devis.ts
└── styles/
    └── globals.css                   # CSS variables + Tailwind base
```

## Variables d'Environnement (.env.local)

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Resend
RESEND_API_KEY=re_...

# Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_...

# App
NEXT_PUBLIC_APP_URL=https://3beestudio.fr
```

## Intégration Stripe

### Flux Série (Checkout Session)
```typescript
// src/app/api/stripe/checkout/route.ts
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const { items } = await req.json()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: items,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/boutique/merci?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/boutique`,
    shipping_address_collection: { allowed_countries: ['FR', 'BE', 'CH'] },
    metadata: { type: 'serie' },
  })

  return Response.json({ url: session.url })
}
```

### Flux NFC/Sur-Mesure (Acompte)
```typescript
// Acompte 30% du devis estimé
const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(depositAmount * 100), // en centimes
  currency: 'eur',
  metadata: {
    type: 'nfc-b2b',
    company: formData.company,
    quantity: formData.quantity,
    nfcUrl: formData.nfcUrl,
    clientEmail: formData.email,
  },
})
```

## Config Next.js 15 (next.config.ts)

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.vercel-storage.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  experimental: {
    typedRoutes: true,
  },
}

export default nextConfig
```

## package.json (scripts)

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}
```
