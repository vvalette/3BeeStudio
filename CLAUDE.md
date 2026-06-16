# 🐝 3BeeStudio — CLAUDE.md
> Point d'entrée unique pour Claude. Lis ce fichier en premier, puis navigue vers les sous-documents.

## Ce projet en une phrase
Studio d'impression 3D français (micro-entreprise) vendant des objets physiques via un site e-commerce Next.js 15. Produit phare : **porte-clés NFC personnalisés B2B**. Modèle hybride : série + sur-mesure.

## Domaine & Contacts
- Site : https://3beestudio.fr (domaine enregistré et vérifié Resend)
- Stack : **Next.js 15** · Tailwind CSS v4 · TypeScript · Vercel · Stripe · Supabase · Resend
- Dev : `npm run dev` → port **3001**

## Stockage de fichiers — règle critique
> ⚠️ Ce projet utilise **Supabase Storage**, PAS Vercel Blob (qui n'est pas configuré).
- Upload logos NFC → bucket Supabase `logos` via `/api/upload/logo` (SVG uniquement, sanitisé XSS)
- Tout nouvel upload (images produits, fichiers STL…) → Supabase Storage, client `supabaseAdmin.storage`
- Ne jamais suggérer `@vercel/blob` ou `put()` de Vercel Blob — non installé, non configuré

## État du projet (juin 2026)
Deux flux de commande **complets et fonctionnels** :

**NFC (porte-clés connectés)**
- Formulaire multi-step (logo upload → lien NFC → contact → récap → Stripe Checkout)
- Webhook Stripe + sync fallback sur la page suivi
- Email de confirmation automatique (Resend, domaine vérifié)
- Page suivi `/suivi/[orderId]` avec timeline et "Prochaines étapes"

**Sur-mesure**
- Formulaire multi-step `/custom` (type projet → description → budget/délai → contact → adresse)
- Devis admin + acompte 50% via Stripe (créé manuellement depuis `/admin/custom/[orderId]`)
- Page suivi `/custom/[orderId]` avec timeline et CTA paiement acompte
- Emails : confirmation client + notification admin interne
- `/sur-mesure` redirige vers `/custom`

**Admin** : `/admin/commandes` — dashboard combiné NFC + sur-mesure, stats, tabs, filtres, tri, bulk delete

Pages **placeholder** (Phase 2) : `/boutique`, `/portfolio`, `/contact`

## Design system
- **Fonts** : `Manrope` (sans, 300–800) + `JetBrains Mono` (mono, 400–600) via `next/font/google`
- **Tokens CSS** : définis dans `src/styles/globals.css` → `@theme` Tailwind v4
  - Backgrounds : `bg-bg-0` (#0A0A0B) … `bg-bg-4` (#25252B)
  - Texte : `text-ink-0` (#FAFAFA) … `text-ink-3` (#54545A)
  - Amber : `text-amber` (#F59E0B), `text-amber-soft` (#FBBF24), `text-amber-deep` (#B45309)
  - Radii : `rounded-xs/sm/md/lg/xl/2xl/pill` (8→999px)
  - Shadows : `shadow-card`, `shadow-amber`, `shadow-pop`
  - CSS vars `--line`, `--line-2`, `--line-amber`, `--honey`, `--btn-primary-bg`
- **Utilitaires CSS** : `.honey-text`, `.no-scrollbar`, `.fade-up`, `.hex-bg`
- **Atomes** : `Eyebrow`, `HexLogo`, `StatusDot`, `ProductGlyph` dans `src/components/ui/`

## Règles absolues
1. **Next.js 15** avec App Router — jamais Pages Router
2. **TypeScript strict** — pas de `any`
3. **Mobile-first** — audience TikTok/Instagram
4. **Aucun fichier numérique vendu** — livrable toujours physique
5. Flux Stripe NFC = **paiement intégral** (Checkout Session) — pas d'acompte sur le flux actuel
6. Langue du site : **français** — une version anglaise est prévue (internationalisation à planifier), ne pas hardcoder des chaînes non-extractibles
7. **`cursor-pointer`** obligatoire sur tous les éléments interactifs (boutons, sélecteurs, options)
8. **Navbar `fixed h-[72px]`** — le `<main>` du layout a `pt-[72px]`, ne jamais doubler dans les pages

## Navbar & espacement (règle critique)
```
Layout <main className="pt-[72px]">   ← source unique de vérité
Hero <section className="-mt-[72px]"> ← fond plein écran, contenu interne pt-[88px]
Pages internes : pt-4 à pt-8 max (layout gère déjà les 72px)
min-h des pages : min-h-[calc(100dvh-72px)]
```

## Mémoire projet — lire en priorité

> **Lis ces fichiers avant de commencer** — ils reflètent l'état réel du projet et les décisions prises.

| Fichier | Contenu |
|---------|---------|
| [`docs/memory/projet-etat.md`](docs/memory/projet-etat.md) | Ce qui est construit, pages live, API routes, infrastructure |
| [`docs/memory/regles-techniques.md`](docs/memory/regles-techniques.md) | Navbar spacing, cursor-pointer, emails, Stripe webhook |
| [`docs/memory/decisions-produit.md`](docs/memory/decisions-produit.md) | Décisions produit figées (NFC URL, paiement intégral, langue) |

## Navigation des docs

| Fichier | Contenu |
|---------|---------|
| [`docs/project/01-vision.md`](docs/project/01-vision.md) | Vision, positionnement, modèle commercial |
| [`docs/project/02-identite-visuelle.md`](docs/project/02-identite-visuelle.md) | Palette, typo, logo |
| [`docs/project/03-produit-nfc.md`](docs/project/03-produit-nfc.md) | Produit phare NFC B2B, pricing, acquisition |
| [`docs/project/04-site-structure.md`](docs/project/04-site-structure.md) | Pages, parcours client, CGV |
| [`docs/project/05-stack-technique.md`](docs/project/05-stack-technique.md) | Architecture réelle, structure fichiers, flux paiement |
| [`docs/project/06-contenu-video.md`](docs/project/06-contenu-video.md) | Stratégie TikTok/Reels, automatisation Bambu Lab |
| [`docs/project/07-marketing-kpis.md`](docs/project/07-marketing-kpis.md) | SEO, fidélisation, budget, KPIs |
| [`docs/project/08-strategie-seo.md`](docs/project/08-strategie-seo.md) | Stratégie SEO détaillée — phases, actions manuelles (GSC, Google Business), état fait/à faire |
| [`docs/todo/TODO.md`](docs/todo/TODO.md) | Tâches sprint — état réel (✅ = fait) |
| [`docs/todo/ROADMAP.md`](docs/todo/ROADMAP.md) | Feuille de route phases 1→4 |
