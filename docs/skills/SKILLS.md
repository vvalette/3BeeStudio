# 🧠 Skills — Index pour Claude

Ce fichier liste les skills (compétences contextuelles) à mobiliser pour chaque type de tâche sur le projet 3BeeStudio.

---

## Skill 01 — Composant Next.js 15 App Router

**Quand l'utiliser :** Création de toute page ou composant React.

### Règles impératives
- **App Router uniquement** — jamais `pages/`
- Tout composant avec state, event ou hook : `'use client'` en première ligne
- Les Server Components (par défaut) ne peuvent pas avoir de state
- Les layouts sont des Server Components sauf si nécessaire
- Utiliser `Link` de `next/link` pour la navigation
- Utiliser `Image` de `next/image` pour les images (jamais `<img>`)
- Les métadonnées via `export const metadata` dans les Server Components

### Template page
```tsx
// src/app/exemple/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Titre | 3BeeStudio',
  description: 'Description SEO',
}

export default function ExemplePage() {
  return (
    <main>
      {/* contenu */}
    </main>
  )
}
```

### Template composant client
```tsx
'use client'
import { useState } from 'react'

interface Props {
  // typer toutes les props
}

export function MonComposant({ }: Props) {
  const [state, setState] = useState(...)
  return <div>...</div>
}
```

---

## Skill 02 — Identité Visuelle 3BeeStudio

**Quand l'utiliser :** N'importe quel composant UI, page ou élément visuel.

### Toujours respecter
- Fond : `bg-slate-900` ou `bg-slate-800` ou `bg-slate-950`
- Accent : `text-amber-500` / `bg-amber-500` / `border-amber-500`
- Fonts : `font-syne` pour les titres, `font-dm` pour le corps
- Jamais de fond blanc pour les pages principales
- Bouton primaire : amber + texte slate-900 (jamais blanc sur amber)
- Border radius cards : `rounded-2xl`
- Animations : subtiles, `transition-all duration-200`
- Mobile-first : commencer par les classes sans préfixe, puis `md:` et `lg:`

### Classes utiles
```
Titres:      font-syne font-bold text-3xl md:text-5xl tracking-tight
Sous-titres: text-slate-400 font-light
Cartes:      bg-slate-800 border border-slate-700 rounded-2xl
Accent glow: shadow-[0_8px_24px_rgba(245,158,11,0.3)]
```

---

## Skill 03 — Stripe Integration

**Quand l'utiliser :** Tout ce qui touche aux paiements.

### Deux flux — ne jamais les mélanger

**Flux A — Série (Checkout Session)**
```typescript
// Côté serveur uniquement
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
// Crée une session, redirige vers Stripe Hosted Page
```

**Flux B — NFC/Sur-mesure (Payment Intent + acompte)**
```typescript
// Amount en centimes (euros × 100)
// Métadonnées obligatoires : type, company, quantity, nfcUrl, clientEmail
```

### Webhook — points de vigilance
- Toujours vérifier la signature avec `stripe.webhooks.constructEvent()`
- Utiliser `stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items'] })`
- Gérer les événements : `checkout.session.completed`, `payment_intent.succeeded`

---

## Skill 04 — Formulaire Multi-Step

**Quand l'utiliser :** Formulaire devis NFC, formulaire sur-mesure.

### Pattern avec react-hook-form + zod
```typescript
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'

const STEPS = ['Projet', 'Logo', 'Coordonnées'] as const
type Step = 0 | 1 | 2

export function MultiStepForm() {
  const [step, setStep] = useState<Step>(0)
  // ...
}
```

### Règles
- Valider chaque étape avant de passer à la suivante (zod schema par étape)
- Indicateur de progression visible (barre ou points)
- Bouton "Retour" à partir de l'étape 2
- Loading state sur le bouton de soumission final
- Message de succès clair après soumission

---

## Skill 05 — API Route Next.js 15

**Quand l'utiliser :** Endpoints `src/app/api/*/route.ts`

```typescript
// src/app/api/exemple/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // traitement...
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[API exemple]', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
```

### Règles
- Toujours try/catch
- Toujours retourner un status HTTP approprié
- Valider le body avec zod avant traitement
- Ne jamais exposer les clés API dans les réponses

---

## Skill 06 — Email Resend + React Email

**Quand l'utiliser :** Emails transactionnels (confirmation, suivi, expédition).

```typescript
// src/lib/resend.ts
import { Resend } from 'resend'
export const resend = new Resend(process.env.RESEND_API_KEY)

// Envoi
await resend.emails.send({
  from: '3BeeStudio <bonjour@3beestudio.fr>',
  to: clientEmail,
  subject: 'Votre commande est confirmée 🐝',
  react: OrderConfirmationEmail({ orderId, items }),
})
```

### 5 emails à créer
1. Confirmation commande série
2. Confirmation acompte NFC/sur-mesure
3. Impression lancée
4. Expédié + numéro de suivi
5. J+7 programme photo (-10%)

---

## Skill 07 — Upload Fichiers (Vercel Blob)

**Quand l'utiliser :** Upload logo client (formulaire NFC), upload fichiers sur-mesure (.stl, croquis).

```typescript
import { put } from '@vercel/blob'

// Dans une Server Action ou API Route
const blob = await put(filename, file, {
  access: 'public',
  addRandomSuffix: true,
})
// blob.url = URL publique du fichier
```

### Avec react-dropzone (côté client)
```tsx
'use client'
import { useDropzone } from 'react-dropzone'
// Accept: { 'image/*': ['.png', '.jpg', '.svg'], 'model/stl': ['.stl'] }
```
