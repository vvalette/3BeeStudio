# État du projet — juin 2026

## Flux NFC (complet et fonctionnel ✅)

Formulaire multi-step : upload logo → sélecteur lien NFC → infos contact → récap → Stripe Checkout → email confirmation

- Paiement **intégral** (pas d'acompte) via Stripe Checkout Session
- Webhook `/api/stripe/webhook` : `checkout.session.completed` + `payment_intent.succeeded` (fallback)
- Sync Stripe direct dans `/suivi/[orderId]` si webhook lent (fallback race condition)
- Email confirmation automatique : Resend + template React Email, domaine `3beestudio.fr` vérifié
  - From : `commandes@3beestudio.fr` / Reply-to : `contact@3beestudio.fr`
  - Logo : `logo-name-only.png` depuis `NEXT_PUBLIC_APP_URL/images/`

## Pages live

| Page | Statut |
|------|--------|
| `/` | ✅ Landing complète (9 sections) |
| `/nfc` | ✅ Formulaire commande NFC multi-step |
| `/suivi/[orderId]` | ✅ Suivi + timeline + prochaines étapes + sync Stripe |
| `/cgv` | ✅ |
| `/mentions-legales` | ✅ |
| `/politique-de-confidentialite` | ✅ |
| `/admin/commandes` | ✅ Liste + détail + changement de statut |
| `/boutique` | 🚧 Placeholder Phase 2 |
| `/sur-mesure` | 🚧 Placeholder Phase 2 |
| `/portfolio` | 🚧 Placeholder Phase 2 |
| `/contact` | 🚧 Placeholder Phase 2 |

## API routes

| Route | Rôle |
|-------|------|
| `POST /api/nfc/order` | Crée commande Supabase + session Stripe |
| `POST /api/stripe/webhook` | Confirme paiement + envoie email |
| `POST /api/nfc/verify-link` | Vérifie URL/profil NFC (best-effort) |
| `POST /api/upload/logo` | Upload logo vers Vercel Blob |
| `GET /api/test-email` | ⚠️ Diagnostic — supprimer avant prod |

## Infrastructure

- **Supabase** : table `orders`, RLS désactivé (accès service_role uniquement)
- **Resend** : domaine `3beestudio.fr` vérifié, `RESEND_FROM_EMAIL=commandes@3beestudio.fr`
- **Stripe** : mode test actif, webhook à configurer sur Vercel prod
- **Dev** : port `3001` (`npm run dev`)
- **Stripe CLI en dev** : `stripe listen --forward-to localhost:3001/api/stripe/webhook`
