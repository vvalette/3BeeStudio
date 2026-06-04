# 🧠 Skills — Index pour Claude

Ce fichier liste les skills (compétences contextuelles) à mobiliser pour chaque type de tâche sur le projet 3BeeStudio.

---

## Skill 01 — Composant Next.js 15 App Router

**Quand l'utiliser :** Création de toute page ou composant React.

### Règles impératives
- **App Router uniquement** — jamais `pages/`
- Tout composant avec state, event ou hook : `'use client'` en première ligne
- Les Server Components (par défaut) ne peuvent pas avoir de state
- Utiliser `Link` de `next/link` pour la navigation
- Utiliser `Image` de `next/image` pour les images (jamais `<img>`)
- Les métadonnées via `export const metadata` dans les Server Components
- **TypeScript strict** — jamais de `any`

### Template page
```tsx
// src/app/exemple/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Titre',
  description: 'Description SEO',
}

export default function ExemplePage() {
  return <main>{/* contenu */}</main>
}
```

### Template composant client
```tsx
'use client'
import { useState } from 'react'

interface Props { /* typer toutes les props */ }

export function MonComposant({}: Props) {
  const [state, setState] = useState(...)
  return <div>...</div>
}
```

---

## Skill 02 — Identité Visuelle 3BeeStudio

**Quand l'utiliser :** N'importe quel composant UI, page ou élément visuel.

> Voir `docs/project/02-identite-visuelle.md` pour la référence complète.

### Couleurs — toujours utiliser les tokens du design system

**Backgrounds** : `bg-bg-0` (#0A0A0B) … `bg-bg-4` (#25252B)
**Texte** : `text-ink-0` (#FAFAFA) … `text-ink-3` (#54545A)
**Amber** : `text-amber` (#F59E0B) · `text-amber-soft` (#FBBF24) · `text-amber-deep` (#B45309)
**Bordures** (CSS vars) : `var(--line)` · `var(--line-2)` · `var(--line-amber)`

### Fonts
```tsx
font-sans   // Manrope (corps, UI)
font-mono   // JetBrains Mono (labels, codes, eyebrows)
```

### Border radius
```
rounded-xs(8) · rounded-sm(12) · rounded-md(18) · rounded-lg(24) · rounded-xl(32) · rounded-pill(999)
```

### Classes utilitaires
```
.honey-text    → gradient amber clippé sur le texte
.no-scrollbar  → cache la scrollbar
.fade-up       → animation entrée
.hex-bg        → fond hexagonal amber
```

### Bouton primaire (toujours ce pattern)
```tsx
<button
  className="flex h-[52px] items-center justify-center gap-2 rounded-pill font-sans font-semibold text-[15px] text-[#1A1300] transition-all active:scale-[0.97]"
  style={{ background: 'var(--btn-primary-bg)', boxShadow: 'var(--btn-primary-shadow)' }}
>
  Texte
</button>
```

### Carte standard
```tsx
<div className="border border-[var(--line)] bg-bg-2 p-6" style={{ borderRadius: 24, boxShadow: 'var(--shadow-card)' }}>
```

### Eyebrow (label section)
```tsx
import Eyebrow from '@/components/ui/Eyebrow'
<Eyebrow>Texte de section</Eyebrow>
```

---

## Skill 03 — Stripe Integration

**Quand l'utiliser :** Tout ce qui touche aux paiements.

### Deux flux — ne jamais les mélanger

**Flux A — Série (Checkout Session)**
```typescript
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
// Crée une session, redirige vers Stripe Hosted Page
```

**Flux B — Sur-mesure / Porte-clé connecté (Payment Intent + acompte 50%)**
```typescript
// Amount en centimes (euros × 100)
// Métadonnées : type, company, quantity, nfcUrl, clientEmail
```

### Webhook
- Toujours vérifier la signature avec `stripe.webhooks.constructEvent()`
- Gérer : `checkout.session.completed`, `payment_intent.succeeded`

---

## Skill 04 — Formulaire Multi-Step

**Quand l'utiliser :** Formulaire devis porte-clé connecté, formulaire sur-mesure.

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
  // Valider chaque étape avant de passer à la suivante
  // Bouton "Retour" à partir de l'étape 2
  // Loading state sur submit final
}
```

---

## Skill 05 — API Route Next.js 15

```typescript
// src/app/api/exemple/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // Valider avec zod avant traitement
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[API exemple]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
```

---

## Skill 06 — Email Resend + React Email

```typescript
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: '3BeeStudio <bonjour@3beestudio.fr>',
  to: clientEmail,
  subject: 'Votre commande est confirmée 🐝',
  react: OrderConfirmationEmail({ orderId, items }),
})
```

**5 emails à créer :**
1. Confirmation commande série
2. Confirmation acompte porte-clé connecté / sur-mesure
3. Impression lancée
4. Expédié + numéro de suivi
5. J+7 après livraison (-10% prochaine commande)

---

## Skill 07 — Upload Fichiers (Vercel Blob)

```typescript
import { put } from '@vercel/blob'

const blob = await put(filename, file, {
  access: 'public',
  addRandomSuffix: true,
})
// blob.url = URL publique du fichier
```

**Usages :** upload logo client (formulaire porte-clé), upload fichiers sur-mesure (.stl, croquis, photos).
