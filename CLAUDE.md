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
- Devis admin + acompte via Stripe depuis `/admin/custom/[orderId]` : composeur de lignes (objet, désignation, qté, PU), **PDF généré par l'app** (`src/lib/quote/pdf.ts`, maquette `docs/reference/devis-modele.pdf`) joint à l'email, numérotation `DEV-AAAA-NNN`. Le total du devis = somme des lignes, jamais un champ libre
- **Encaissements horodatés** : `deposit_paid_at` et `balance_paid_at` posés par le webhook Stripe, lus par `paymentState()` — carte « Paiements » sur la fiche admin et sur la page de suivi client
- **Solde** réclamé depuis la même fiche quand la pièce est prête, avant expédition (2ᵉ Checkout Stripe, colonnes `balance_*`) — déclaré à la date d'encaissement du solde, ligne CSV séparée
- Demande créable **à la main** depuis `/admin/sur-mesure/nouveau` (demandes reçues en DM)
- **Étiquette Boxtal** générée depuis la fiche : colis (poids + dimensions) déclaré à la main, coût relevé après création, passage en `shipped` par le webhook Boxtal
- Page suivi `/custom/[orderId]` avec timeline et CTA paiement acompte
- Emails : confirmation client + notification admin interne
- `/sur-mesure` redirige vers `/custom`

**Boutique (objets de série)**
- Catalogue `/boutique` + fiche produit `/boutique/[slug]` (markdown, viewer 3D STL/3MF, contenu FR/EN)
- Panier + checkout Stripe `/boutique/commande`, paiement intégral + frais de port calculés
- **Mode de livraison** : livraison à domicile OU **retrait studio** (0 € de port, sans adresse) — sélecteur dans le checkout
- **Codes promo** `/admin/boutique/promos` : pourcentage, montant fixe ou **livraison gratuite** (impossible en coupon Stripe, le port est calculé côté app → table maison `promo_codes`). Conditions : minimum d'achat, objets/fichiers, plafond d'usages, une fois par client, fenêtre de dates. Saisie au checkout, revalidée côté serveur ; consommation atomique par la RPC `redeem_promo_code`, rendue si la session Stripe expire. **Non cumulable** avec la remise newsletter (sauf livraison gratuite, qui porte sur le port)
- **Réduction newsletter −10%** : appliquée auto au checkout boutique si l'email est abonné et `promo_used = false` (coupon Stripe one-shot, colonne `discount_amount`) — partagée avec le flux NFC
- Webhook Stripe → statut `confirmed` + décrément de stock atomique + email de confirmation
- **Email de confirmation localisé** (FR/EN selon `shop_orders.locale`, capturé au checkout)
- **Expédition Boxtal** : depuis `/admin/boutique/commande/[id]` → génération étiquette + suivi auto via webhook Boxtal (table `shop_orders.boxtal_order_id`). Retrait studio = pas d'expédition
- Page suivi `/boutique/suivi/[orderId]`
- Admin produits : `/admin/boutique` (CRUD, upload images + STL, gestion stock, EN) · Admin commandes : `/admin/boutique/commande/[id]` (`AdminShopOrderDetail`)
- **Audience** `/admin/boutique/audience` : consultations par fiche produit (entonnoir vues → paniers → ventes, fenêtres 7/30/90 j). Comptage par beacon depuis la fiche (elle est en ISR : le rendu serveur ne verrait qu'une visite par heure), agrégat quotidien dans `shop_product_stats_daily`. Sans cookie ni traceur — empreinte visiteur salée qui tourne chaque nuit, purge 45 j / 13 mois par cron

**Facturation & documents**
- `src/lib/documents/` : moteur PDF partagé — **devis** (`DEV-AAAA-NNN`) et **factures** (`FAC-AAAA-NNN`), même maquette (`docs/reference/devis-modele.pdf`)
- Table `invoices` : numérotation **continue toutes sources confondues** (obligation comptable), instantané des lignes figé à l'émission, une seule facture par commande
- La facture part **en pièce jointe de l'email d'expédition**, sur les 3 flux. Émission non bloquante : un échec ne retient pas l'email
- À la livraison (webhook Boxtal `DELIVERED`), email « colis arrivé » + demande d'avis Google (`src/lib/links.ts`)

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
- **Emails** : charte partagée — jetons dans `src/emails/theme.ts`, briques dans `src/emails/components.tsx` (thème clair, aligné sur le site). Ne jamais redéfinir une palette dans un template, ni écrire du HTML inline dans une route : `src/emails/templates.test.ts` verrouille la règle (fond clair, pas de `rgba()`)

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
10. **Ponctuation FR : pas de tiret cadratin** : jamais de `—` dans le texte français vu par le client (emails, objets d'email, copie du site, CGV, PDF). Selon le rôle : virgule pour une incise, deux-points pour une annonce, point pour une rupture, `·` comme séparateur d'étiquette (objet d'email, pied de page). L'anglais garde ses em dashes, ils y sont idiomatiques.

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
| [`docs/todo/TODO-produits-numeriques.md`](docs/todo/TODO-produits-numeriques.md) | Vente de fichiers 3D — reste à faire, vigilances, décisions prises |
| [`docs/todo/TODO-vinted.md`](docs/todo/TODO-vinted.md) | Canal Vinted Pro — étude d'intégration, voies d'accès, paliers, vigilances fiscales |
| [`docs/todo/ROADMAP.md`](docs/todo/ROADMAP.md) | Feuille de route phases 1→4 |
| [`docs/AVANT_PROD.md`](docs/AVANT_PROD.md) | Checklist mise en prod : audit, fixes appliqués, actions manuelles (env, Stripe Live, migrations, SEO) |
