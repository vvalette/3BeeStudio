# 🐝 3BeeStudio — CLAUDE.md
> Point d'entrée unique pour Claude. Lis ce fichier en premier, puis navigue vers les sous-documents.

## Ce projet en une phrase
Studio d'impression 3D français (micro-entreprise) vendant des objets physiques via un site e-commerce Next.js 15. Produit phare : **porte-clés NFC personnalisés B2B**. Modèle hybride : série + sur-mesure.

## Domaine & Contacts
- Site : https://3beestudio.fr (domaine déjà enregistré)
- Stack : **Next.js 15** · Tailwind CSS v4 · TypeScript · Vercel · Stripe
- Repo GitHub : à créer (compte existant, lier à Vercel)

## Design system (handoff `design_handoff_3beestudio/`)
- **Fonts** : `Manrope` (sans, 300–800) + `JetBrains Mono` (mono, 400–600) via `next/font/google`
- **Tokens CSS** : définis dans `src/styles/globals.css` → `@theme` Tailwind v4
  - Backgrounds : `bg-bg-0` (#0A0A0B) … `bg-bg-4` (#25252B)
  - Texte : `text-ink-0` (#FAFAFA) … `text-ink-3` (#54545A)
  - Amber : `text-amber` (#F59E0B), `text-amber-soft` (#FBBF24), `text-amber-deep` (#B45309)
  - Radii : `rounded-xs/sm/md/lg/xl/2xl/pill` (8→999px)
  - Shadows : `shadow-card`, `shadow-amber`, `shadow-pop`
  - CSS vars `--line`, `--line-2`, `--line-amber`, `--honey`, `--btn-primary-bg` utilisables en inline style
- **Utilitaires CSS** : `.honey-text`, `.no-scrollbar`, `.fade-up`, `.hex-bg` (voir globals.css)
- **Atomes** : `Eyebrow`, `HexLogo`, `StatusDot`, `ProductGlyph` dans `src/components/ui/`
- **Sections landing** : `src/components/landing/` — Hero, VideoStrip, ProductsGrid, HowItWorks, CustomCTA, Portfolio, Testimonials, NewsletterBlock, SiteFooter

## Navigation des docs

| Fichier | Contenu |
|---------|---------|
| [`docs/project/01-vision.md`](docs/project/01-vision.md) | Vision, positionnement, modèle commercial |
| [`docs/project/02-identite-visuelle.md`](docs/project/02-identite-visuelle.md) | Palette, typo, logo |
| [`docs/project/03-produit-nfc.md`](docs/project/03-produit-nfc.md) | Produit phare NFC B2B, pricing, acquisition |
| [`docs/project/04-site-structure.md`](docs/project/04-site-structure.md) | Pages, parcours client, CGV |
| [`docs/project/05-stack-technique.md`](docs/project/05-stack-technique.md) | Architecture, dépendances Next.js 15, Stripe |
| [`docs/project/06-contenu-video.md`](docs/project/06-contenu-video.md) | Stratégie TikTok/Reels, automatisation Bambu Lab |
| [`docs/project/07-marketing-kpis.md`](docs/project/07-marketing-kpis.md) | SEO, fidélisation, budget, KPIs |
| [`docs/todo/TODO.md`](docs/todo/TODO.md) | Liste de tâches par sprint |
| [`docs/todo/ROADMAP.md`](docs/todo/ROADMAP.md) | Feuille de route complète phases 1→4 |
| [`docs/skills/SKILLS.md`](docs/skills/SKILLS.md) | Index des skills pour Claude |

## Règles absolues pour ce projet
1. **Next.js 15** avec App Router — jamais Pages Router
2. **TypeScript strict** — pas de `any`
3. **Mobile-first** — l'audience vient de TikTok/Instagram
4. **Aucun fichier numérique vendu** — le livrable est toujours un objet physique
5. Deux flux Stripe distincts : checkout classique (série) et payment intent (acompte sur-mesure)
6. Langue du site : **français uniquement**

## Démarrage rapide
```bash
npx create-next-app@latest 3beestudio --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd 3beestudio
```
Voir [`docs/project/05-stack-technique.md`](docs/project/05-stack-technique.md) pour toutes les dépendances.
