# 05 — Stack Technique

## Architecture

```
3beestudio.fr/
├── Frontend      Next.js 15 (App Router) + Tailwind CSS v4 + TypeScript
├── Hébergement   Vercel (déploiement auto depuis GitHub)
├── Paiements     Stripe (Checkout Session — paiement intégral NFC)
├── Emails        Resend + React Email (domaine 3beestudio.fr vérifié)
├── Upload logos  Vercel Blob
├── Base données  Supabase (table orders)
└── Fonts         Manrope (300–800) + JetBrains Mono (400–600) via next/font/google
```

## Structure de Fichiers (état réel)

```
src/
├── app/
│   ├── layout.tsx                          # Root layout — navbar + pt-[72px]
│   ├── page.tsx                            # Landing page (9 sections)
│   ├── nfc/page.tsx                        # Formulaire multi-step NFC ✅
│   ├── suivi/[orderId]/page.tsx            # Suivi commande + sync Stripe ✅
│   ├── admin/
│   │   ├── page.tsx                        # Auth admin
│   │   └── commandes/
│   │       ├── page.tsx                    # Liste commandes ✅
│   │       └── [id]/page.tsx               # Détail + statut ✅
│   ├── cgv/page.tsx                        ✅
│   ├── mentions-legales/page.tsx           ✅
│   ├── politique-de-confidentialite/       ✅
│   ├── boutique/page.tsx                   # Placeholder
│   ├── sur-mesure/page.tsx                 # Placeholder
│   ├── portfolio/page.tsx                  # Placeholder
│   ├── contact/page.tsx                    # Placeholder
│   └── api/
│       ├── nfc/
│       │   ├── order/route.ts              # POST — crée commande + session Stripe ✅
│       │   └── verify-link/route.ts        # POST — vérifie URL/profil NFC ✅
│       ├── stripe/
│       │   └── webhook/route.ts            # POST — confirme paiement + email ✅
│       ├── upload/
│       │   └── logo/route.ts               # POST — upload logo Vercel Blob ✅
│       ├── admin/
│       │   ├── login/route.ts              ✅
│       │   └── orders/[id]/route.ts        ✅
│       └── test-email/route.ts             # GET — diagnostic (⚠️ supprimer en prod)
├── components/
│   ├── layout/
│   │   └── Navbar.tsx                      # fixed h-[72px]
│   ├── landing/
│   │   ├── Hero.tsx                        # -mt-[72px] pour fond plein écran
│   │   ├── NFCSection.tsx
│   │   ├── ProductsGrid.tsx
│   │   ├── CustomCTA.tsx
│   │   ├── VideoStrip.tsx
│   │   ├── Portfolio.tsx
│   │   ├── Testimonials.tsx
│   │   ├── NewsletterBlock.tsx
│   │   └── SiteFooter.tsx
│   ├── nfc/
│   │   ├── NfcOrderForm.tsx               # Formulaire multi-step complet ✅
│   │   └── NfcLinkPicker.tsx              # Sélecteur destination NFC ✅
│   ├── admin/
│   │   ├── AdminOrdersList.tsx            ✅
│   │   └── AdminOrderDetail.tsx           ✅
│   └── ui/
│       ├── Select.tsx                     # Dropdown custom accessible ✅
│       ├── LegalLayout.tsx
│       ├── Eyebrow.tsx
│       ├── HexLogo.tsx
│       ├── StatusDot.tsx
│       └── ProductGlyph.tsx
├── emails/
│   └── OrderConfirmation.tsx              # Template React Email ✅
├── lib/
│   ├── stripe.ts                          # Client Stripe
│   ├── supabase.ts                        # Clients public + admin
│   ├── resend.ts                          # sendOrderConfirmation() ✅
│   └── utils.ts                           # cn(), formatPrice()
├── types/
│   └── order.ts                           # Order, OrderStatus, calcOrder(), etc.
└── styles/
    └── globals.css                        # Tokens design system Tailwind v4
```

## Variables d'Environnement (.env.local)

```env
# Stripe (Checkout par redirection → pas de clé publishable)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Resend — domaine 3beestudio.fr vérifié
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=commandes@3beestudio.fr   # obligatoire

# App
NEXT_PUBLIC_APP_URL=http://localhost:3001   # prod: https://3beestudio.fr
```

## Flux de Paiement NFC (implémenté)

```
1. POST /api/nfc/order
   → Insère commande en DB (status: 'pending_payment')
   → Crée Stripe Checkout Session (paiement intégral)
   → Retourne { checkout_url, order_id }

2. Utilisateur paie sur Stripe

3a. Stripe → POST /api/stripe/webhook (checkout.session.completed)
    → Update status: 'confirmed'
    → sendOrderConfirmation() → Resend

3b. [Fallback] GET /suivi/[orderId]?payment=success
    → Si status encore 'pending_payment' → stripe.checkout.sessions.retrieve()
    → Si payment_status === 'paid' → Update DB + sendOrderConfirmation()
```

## Règles Navbar / Espacement

- Navbar : `fixed inset-x-0 top-0 h-[72px] z-50`
- Layout `<main>` : `pt-[72px]` — source unique de vérité
- Hero section : `-mt-[72px]` pour fond plein écran, contenu interne a `pt-[88px]`/`pt-[72px]`
- Pages internes : ajouter `pt-4` à `pt-8` pour respiration, jamais `pt-[72px]` (déjà dans layout)
- `min-h` : toujours `min-h-[calc(100dvh-72px)]`

## Commandes Dev

```bash
npm run dev          # Port 3001 (--turbopack)
npm run build
npm run type-check   # tsc --noEmit
npm run migrate      # tsx scripts/migrate.ts

# Stripe webhook en local
stripe listen --forward-to localhost:3001/api/stripe/webhook
```
