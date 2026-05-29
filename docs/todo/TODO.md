# ✅ TODO — Sprint 1 (Semaines 1-2)
> Focus : avoir un site live avec Stripe qui fonctionne et les premières vidéos postées.

---

## 🔧 Setup Technique

- [ ] `npx create-next-app@latest 3beestudio --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
- [ ] Créer repo GitHub `3beestudio`
- [ ] Push initial sur GitHub
- [ ] Créer projet Vercel, lier au repo GitHub
- [ ] Pointer DNS `3beestudio.fr` → Vercel (TTL ~24h)
- [ ] Créer compte Stripe, activer le compte (vérification identité)
- [ ] Créer compte Resend, vérifier le domaine `3beestudio.fr`
- [ ] Créer compte Supabase, créer le projet `3beestudio`
- [ ] Copier `.env.local` avec toutes les clés (voir `05-stack-technique.md`)
- [ ] Installer les dépendances npm (voir `05-stack-technique.md`)

## 🎨 Design & Pages

- [ ] `src/styles/globals.css` — variables CSS couleurs + fonts
- [ ] `src/app/layout.tsx` — Root layout avec fonts Syne + DM Sans
- [ ] `src/components/layout/Navbar.tsx`
- [ ] `src/components/layout/Footer.tsx`
- [ ] `src/app/page.tsx` — Page d'accueil complète
- [ ] `src/app/nfc/page.tsx` — Landing NFC B2B
- [ ] `src/components/nfc/NfcMockup.tsx` — Mockup animé porte-clé
- [ ] `src/components/nfc/NfcDevisForm.tsx` — Formulaire devis simple
- [ ] `src/app/boutique/page.tsx` — Grille produits
- [ ] `src/app/boutique/[slug]/page.tsx` — Fiche produit
- [ ] `src/app/cgv/page.tsx`
- [ ] `src/app/mentions-legales/page.tsx`

## 💳 Stripe

- [ ] `src/lib/stripe.ts` — Config client + serveur
- [ ] `src/app/api/stripe/checkout/route.ts` — Checkout série
- [ ] `src/app/api/stripe/webhook/route.ts` — Webhook
- [ ] Tester un paiement test de bout en bout
- [ ] Activer Stripe en mode live

## 📧 Emails

- [ ] `src/lib/resend.ts` — Config Resend
- [ ] Email de confirmation commande (template React Email)
- [ ] Tester l'envoi d'email

## 📱 Produit NFC

- [ ] Commander 100 puces NFC NTAG213 sur Amazon
- [ ] Installer NFC Tools sur Android
- [ ] Imprimer 3 prototypes porte-clé (dont 1 avec logo 3BeeStudio)
- [ ] Programmer 3 puces de démo (Instagram, Google Maps, site)
- [ ] Filmer la démo NFC 10s (pour la page `/nfc` + TikTok)

## 📹 Contenu (à faire en parallèle)

- [ ] Activer le timelapse dans Bambu Studio (une fois pour toutes)
- [ ] Créer le template CapCut réutilisable (9:16, logo, musique)
- [ ] Poster la 1ère vidéo TikTok (timelapse d'impression)
- [ ] Poster sur Instagram Reels le même contenu

---

## 📋 Checklist Lancement

Avant de dire "le site est live" :
- [ ] Stripe live mode activé (pas test)
- [ ] Domaine 3beestudio.fr pointe sur Vercel avec HTTPS
- [ ] Webhook Stripe configuré sur Vercel
- [ ] Au moins 1 produit de série achetable
- [ ] Formulaire devis NFC qui envoie un email
- [ ] Pages CGV et Mentions légales en ligne
- [ ] Test mobile (iPhone + Android) : tout s'affiche bien
- [ ] Test achat complet de bout en bout avec carte Stripe test

---

## 🐞 Bugs Connus / Points de vigilance

- Utiliser **Next.js 15** — App Router uniquement, jamais Pages Router
- Tailwind CSS v4 : la config est dans `globals.css`, pas dans `tailwind.config.js`
- Stripe webhook : utiliser `stripe listen --forward-to localhost:3000/api/stripe/webhook` en dev
- Les Server Actions Next.js 15 nécessitent `'use server'` en début de fichier
- Turbopack activé par défaut avec `next dev` en Next.js 15
