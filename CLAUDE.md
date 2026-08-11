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
- Buckets Supabase Storage utilisés (client `supabaseAdmin.storage`) :
  - `logos` → logos NFC via `/api/upload/logo` (SVG uniquement, sanitisé XSS)
  - `product-images` → images produits boutique via `/api/admin/upload/product-image`
  - `stl-files` → modèles 3D STL produits via `/api/admin/upload/stl`
- Tout nouvel upload → Supabase Storage, jamais `@vercel/blob` ni `put()` de Vercel Blob (non installé, non configuré)

## État du projet (juin 2026)
Trois flux de commande **complets et fonctionnels** :

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

**Boutique (objets de série)**
- Catalogue `/boutique` + fiche produit `/boutique/[slug]` (markdown, viewer 3D STL/3MF, contenu FR/EN)
- Panier + checkout Stripe `/boutique/commande`, paiement intégral + frais de port calculés
- **Mode de livraison** : livraison à domicile OU **retrait studio** (0 € de port, sans adresse) — sélecteur dans le checkout
- **Réduction newsletter −10%** : appliquée auto au checkout boutique si l'email est abonné et `promo_used = false` (coupon Stripe one-shot, colonne `discount_amount`) — partagée avec le flux NFC
- Webhook Stripe → statut `confirmed` + décrément de stock atomique + email de confirmation
- **Email de confirmation localisé** (FR/EN selon `shop_orders.locale`, capturé au checkout)
- **Expédition Boxtal** : depuis `/admin/boutique/commande/[id]` → génération étiquette + suivi auto via webhook Boxtal (table `shop_orders.boxtal_order_id`). Retrait studio = pas d'expédition
- Page suivi `/boutique/suivi/[orderId]`
- Admin produits : `/admin/boutique` (CRUD, upload images + STL, gestion stock, EN) · Admin commandes : `/admin/boutique/commande/[id]` (`AdminShopOrderDetail`)

**Admin** : nav dédiée — `/admin/commandes` (dashboard global NFC + sur-mesure + boutique, CA global, stats, tabs, filtres, tri, bulk delete), pages dédiées `/admin/nfc`, `/admin/sur-mesure`, `/admin/boutique`, `/admin/testimonials`

Pages **placeholder** (Phase 2) : `/portfolio`, `/contact`

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
4. **Deux natures de produit en boutique** (`shop_products.product_type`) :
   - `physical` → objet imprimé et expédié (stock, poids, port, Boxtal)
   - `digital` → fichier 3D téléchargeable (ni stock, ni poids, ni port)

   Règles non négociables sur le numérique :
   - Le fichier **vendu** vit dans le bucket **privé** `stl-downloads`, jamais exposé — servi uniquement par URL signée (2 min) via `/api/boutique/download/[orderId]`, après paiement, avec quota et expiration
   - `stl_url` reste le **maillage d'aperçu public** du viewer 3D : y mettre une version décimée, **jamais** le fichier vendu (le navigateur le charge, donc il est extractible)
   - Le renoncement au droit de rétractation (art. L221-28 3°) est **obligatoire** au checkout et horodaté (`shop_orders.digital_waiver_at`) — sans lui la commande est refusée côté serveur
   - Panier mixte : le port se calcule sur la part **physique** seule (`splitCart`) ; un panier 100 % fichiers passe en `delivery_mode = 'digital'` (pas d'adresse collectée)
   - CA à déclarer séparément : les fichiers sont une **prestation de service**, pas une vente de marchandise (plafonds et abattements différents) — colonne « Catégorie fiscale » dans l'export CSV
5. Flux Stripe NFC = **paiement intégral** (Checkout Session) — pas d'acompte sur le flux actuel
6. **i18n implémentée** (next-intl) : FR par défaut + EN (`localePrefix: 'as-needed'` → `/` FR, `/en/` EN). Toute chaîne visible passe par `messages/fr.json` + `messages/en.json` — ne jamais hardcoder de texte non-extractible
7. **`cursor-pointer`** obligatoire sur tous les éléments interactifs (boutons, sélecteurs, options)
8. **Navbar `fixed h-[72px]`** — le `<main>` du layout a `pt-[72px]`, ne jamais doubler dans les pages
9. **Formulaires — données neutres obligatoires** : les placeholders doivent être 100% fictifs et génériques (ex: `Jean Dupont`, `75001`, `Paris`, `vous@exemple.fr`). Interdit : prénoms/noms réels, adresses réelles, codes postaux réels, villes personnelles du développeur. Tous les champs contact/adresse ont `autoComplete="off"` pour éviter les suggestions navigateur.

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
| [`docs/AVANT_PROD.md`](docs/AVANT_PROD.md) | Checklist mise en prod : audit, fixes appliqués, actions manuelles (env, Stripe Live, migrations, SEO) |
