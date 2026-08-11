# ✅ TODO — Sprint 1 (Semaines 1-2)
> Focus : avoir un site live avec Stripe qui fonctionne et les premières vidéos postées.

---

## 🔧 Setup Technique

- [x] Créer repo GitHub `3beestudio`
- [x] Push initial sur GitHub
- [ ] Créer projet Vercel, lier au repo GitHub
- [ ] Pointer DNS `3beestudio.fr` → Vercel (TTL ~24h)
- [x] Créer compte Stripe, activer le compte (vérification identité)
- [x] Créer compte Resend, vérifier le domaine `3beestudio.fr` ✅ (domaine vérifié)
- [x] Créer compte Supabase, créer le projet `3beestudio`
- [x] Copier `.env.local` avec toutes les clés

## 🎨 Design & Pages

- [x] `src/styles/globals.css` — tokens design system (bg-0…4, ink-0…3, amber, radii, shadows)
- [x] `src/app/layout.tsx` — Root layout Manrope + JetBrains Mono + `pt-[72px]` pour navbar fixed
- [x] `src/components/layout/Navbar.tsx` — Logo texte + liens + burger mobile (h-[72px])
- [x] `src/components/landing/SiteFooter.tsx` — Footer avec socials
- [x] `src/app/page.tsx` — Landing page complète (Hero, NFC, produits, CTA, vidéo, portfolio, testimonials, newsletter)
- [x] `src/app/cgv/page.tsx` ✅
- [x] `src/app/mentions-legales/page.tsx` ✅
- [x] `src/app/politique-de-confidentialite/page.tsx` ✅
- [x] `src/app/nfc/page.tsx` — Page dédiée porte-clé connecté avec formulaire multi-step complet
- [x] `src/app/suivi/[orderId]/page.tsx` — Suivi commande avec timeline + prochaines étapes + sync Stripe
- [x] `src/app/boutique/page.tsx` — Grille produits + catégories + panier ✅
- [x] `src/app/boutique/[slug]/page.tsx` — Fiche produit (markdown, viewer 3D, FR/EN) ✅
- [x] `src/app/custom/page.tsx` — Formulaire sur-mesure multi-step ✅ (3 étapes, validation RHF+Zod, budget/délai pills)
- [x] `src/app/custom/[orderId]/page.tsx` — Suivi sur-mesure ✅ (timeline + CTA acompte)
- [x] `src/app/sur-mesure/page.tsx` — Redirect → `/custom` ✅
- [ ] `src/app/portfolio/page.tsx` — Galerie masonry (placeholder)
- [x] `src/app/contact/page.tsx` — Formulaire contact → email Resend (juillet 2026) ✅

## 💳 Stripe

- [x] `src/lib/stripe.ts` — Config client Stripe
- [x] `src/app/api/nfc/order/route.ts` — Crée commande + session Stripe Checkout (paiement intégral)
- [x] `src/app/api/stripe/webhook/route.ts` — Webhook + mise à jour statut + envoi email
- [ ] Tester un paiement test de bout en bout ← **prochain**
- [ ] Activer Stripe en mode live
- [ ] Configurer webhook sur Vercel prod (`https://3beestudio.fr/api/stripe/webhook`)

## 📧 Emails

- [x] `src/lib/resend.ts` — Config Resend avec logs détaillés
- [x] `src/emails/OrderConfirmation.tsx` — Template React Email (logo, récap, timeline, reply-to)
- [x] Envoi email confirmation commande (déclenché par webhook + sync page suivi)
- [x] Tester l'envoi d'email ✅

## 🛠️ Admin

- [x] `src/app/admin/commandes/page.tsx` — Dashboard combiné NFC + sur-mesure (stats, tabs, filtres, tri, bulk delete) ✅
- [x] `src/app/admin/commandes/[id]/page.tsx` — Détail NFC + changement statut + Boxtal ✅
- [x] `src/app/admin/custom/[orderId]/page.tsx` — Détail sur-mesure + changement statut + envoi devis Stripe ✅

## 📧 Sur-mesure — Emails

- [x] `src/emails/CustomOrderConfirmation.tsx` — Confirmation client (header texte, pas d'image) ✅
- [x] `src/emails/CustomOrderAdmin.tsx` — Notification interne avec lien `/admin/custom/[id]` ✅

## 🔌 Sur-mesure — API

- [x] `POST /api/custom/order` — Crée demande Supabase + emails ✅
- [x] `POST /api/custom/[orderId]/quote` — Crée session Stripe acompte + email client ✅
- [x] `PATCH /api/admin/custom/[orderId]` — Mise à jour statut/notes/suivi ✅
- [x] `DELETE /api/admin/custom/[orderId]` — Suppression ✅
- [ ] Appliquer migration `006_create_custom_orders.sql` dans Supabase SQL editor (table `custom_orders`)

## 📱 Produit NFC / Porte-clé connecté

- [ ] Commander 100 puces NFC NTAG213 sur Amazon (~25€)
- [ ] Installer NFC Tools sur Android
- [ ] Imprimer 3 prototypes porte-clé (dont 1 avec logo 3BeeStudio)
- [ ] Programmer 3 puces de démo (Instagram, site, téléphone)
- [ ] Filmer la démo NFC 10s (pour `/nfc` + TikTok)

## 📹 Contenu (en parallèle)

- [ ] Activer le timelapse dans Bambu Studio
- [ ] Créer le template CapCut réutilisable (9:16, logo, musique)
- [ ] Poster la 1ère vidéo TikTok
- [ ] Poster sur Instagram Reels le même contenu


---

## 🧪 Sprint qualité — juillet 2026 (fait)

- [x] Pages d'erreur : 404 localisée FR/EN (`[locale]/not-found` + catch-all), `error.tsx` public + admin, `global-error`, 404 racine
- [x] Alertes email critiques (Resend) : échecs webhook Stripe, erreurs checkout, survente de stock — `src/lib/alert.ts`
- [x] Migration `028` : `decrement_shop_stock` retourne `{ new_stock, oversold }` (survente détectée, plus masquée)
- [x] Fix : `.single()` → `.maybeSingle()` dans le webhook (un rejeu Stripe provoquait des 500 en boucle)
- [x] Fix : la page suivi boutique passe par `confirmShopOrder` partagé (le stock est décrémenté même si elle gagne la course contre le webhook)
- [x] Page `/contact` fonctionnelle (form RHF+Zod, honeypot, rate limit, email Resend)
- [x] Tests : 61 unitaires (calculs boutique, webhook Stripe mocké, payload produit admin) + 16 E2E Playwright (smoke 3 flux, desktop + mobile) branchés en CI
- [x] Refactos : NfcOrderForm 1156→130 lignes (steps extraits), AdminOrdersList (hook `useOrderSection`), AdminBoutiqueProductForm 872→253 lignes (sections + état consolidé)
- [x] Types DB Supabase générés (`src/types/database.generated.ts` + wrapper typé) — clients `supabase`/`supabaseAdmin` typés
- [x] `typedRoutes: true` réactivé (liens admin vérifiés à la compilation, `as any` du LocaleSwitcher supprimé)
- [x] Rate limiting : Upstash Redis si `UPSTASH_REDIS_REST_URL/TOKEN` définis, sinon fallback mémoire

---

## 📋 Checklist Lancement

- [ ] Stripe live mode activé
- [ ] Domaine 3beestudio.fr pointe sur Vercel avec HTTPS
- [ ] Webhook Stripe configuré sur Vercel prod
- [x] Formulaire porte-clé NFC complet et fonctionnel ✅
- [x] Email confirmation commande opérationnel ✅
- [x] Page suivi commande `/suivi/[orderId]` ✅
- [x] Pages CGV, Mentions légales et Confidentialité en ligne ✅
- [ ] Test mobile (iPhone + Android)
- [ ] Test achat complet de bout en bout avec carte Stripe test
- [ ] Supprimer `/api/test-email` avant mise en prod

---

## 📥 Produits numériques

Suivi dans un fichier dédié : [`TODO-produits-numeriques.md`](TODO-produits-numeriques.md)
— la vente de fichiers 3D est livrée et en prod ; il reste l'upload de gros
fichiers depuis l'admin, la séparation numérique/physique dans l'admin, et le
ticket GitHub de purge.

---

## 🐞 Points de vigilance

- **Next.js 15** — App Router uniquement, jamais Pages Router
- **Tailwind CSS v4** — tokens dans `globals.css` via `@theme`, pas de `tailwind.config.js`
- **Stripe webhook en dev** : `stripe listen --forward-to localhost:3001/api/stripe/webhook`
- **TypeScript strict** — zéro `any`
- **Navbar** : `fixed h-[72px]` — le layout `<main>` a `pt-[72px]`, ne pas doubler dans les pages
- **cursor-pointer** : obligatoire sur tous les éléments interactifs
- **Dev port** : 3001 (pas 3000)
