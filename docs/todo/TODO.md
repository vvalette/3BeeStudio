# ✅ TODO — Sprint 1 (Semaines 1-2)
> Focus : avoir un site live avec Stripe qui fonctionne et les premières vidéos postées.

---

## 🔧 Setup Technique

- [ ] Créer repo GitHub `3beestudio`
- [ ] Push initial sur GitHub
- [ ] Créer projet Vercel, lier au repo GitHub
- [ ] Pointer DNS `3beestudio.fr` → Vercel (TTL ~24h)
- [ ] Créer compte Stripe, activer le compte (vérification identité)
- [ ] Créer compte Resend, vérifier le domaine `3beestudio.fr`
- [ ] Créer compte Supabase, créer le projet `3beestudio`
- [ ] Copier `.env.local` avec toutes les clés (voir `05-stack-technique.md`)

## 🎨 Design & Pages

- [x] `src/styles/globals.css` — tokens design system (bg-0…4, ink-0…3, amber, radii, shadows)
- [x] `src/app/layout.tsx` — Root layout avec Manrope + JetBrains Mono
- [x] `src/components/layout/Navbar.tsx` — Logo texte + liens + burger mobile
- [x] `src/components/landing/SiteFooter.tsx` — Footer avec socials TikTok/IG/Pinterest/YouTube
- [x] `src/app/page.tsx` — Landing page complète (9 sections)
- [x] `src/components/landing/Hero.tsx`
- [x] `src/components/landing/NFCSection.tsx` — Produit phare porte-clé connecté
- [x] `src/components/landing/ProductsGrid.tsx`
- [x] `src/components/landing/CustomCTA.tsx` — Sur-mesure + timeline
- [x] `src/components/landing/VideoStrip.tsx`
- [x] `src/components/landing/Portfolio.tsx`
- [x] `src/components/landing/Testimonials.tsx`
- [x] `src/components/landing/NewsletterBlock.tsx`
- [x] `src/app/cgv/page.tsx` ✅
- [x] `src/app/mentions-legales/page.tsx` ✅
- [x] `src/app/politique-de-confidentialite/page.tsx` ✅
- [ ] `src/app/nfc/page.tsx` — Page dédiée porte-clé connecté
- [ ] `src/app/boutique/page.tsx` — Grille produits
- [ ] `src/app/boutique/[slug]/page.tsx` — Fiche produit
- [ ] `src/app/sur-mesure/page.tsx` — Formulaire multi-step
- [ ] `src/app/portfolio/page.tsx` — Galerie masonry
- [ ] `src/app/contact/page.tsx` — Formulaire contact

## 💳 Stripe

- [ ] `src/lib/stripe.ts` — Config client + serveur
- [ ] `src/app/api/stripe/checkout/route.ts` — Checkout série
- [ ] `src/app/api/stripe/webhook/route.ts` — Webhook
- [ ] Tester un paiement test de bout en bout
- [ ] Activer Stripe en mode live

## 📧 Emails

- [ ] `src/lib/resend.ts` — Config Resend
- [ ] Email confirmation commande (template React Email)
- [ ] Tester l'envoi d'email

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

## 📋 Checklist Lancement

- [ ] Stripe live mode activé
- [ ] Domaine 3beestudio.fr pointe sur Vercel avec HTTPS
- [ ] Webhook Stripe configuré sur Vercel
- [ ] Au moins 1 produit de série achetable
- [ ] Formulaire devis porte-clé qui envoie un email
- [x] Pages CGV, Mentions légales et Confidentialité en ligne
- [ ] Test mobile (iPhone + Android)
- [ ] Test achat complet de bout en bout avec carte Stripe test

---

## 🐞 Points de vigilance

- **Next.js 15** — App Router uniquement, jamais Pages Router
- **Tailwind CSS v4** — tokens dans `globals.css` via `@theme`, pas de `tailwind.config.js`
- **Stripe webhook** : `stripe listen --forward-to localhost:3000/api/stripe/webhook` en dev
- **TypeScript strict** — zéro `any`
- **Terminologie** : "porte-clé connecté" sur le site, "NFC" gardé dans les keywords SEO
