# 🐝 3BeeStudio

Studio d'impression 3D français — Porte-clés NFC B2B · Produits de série · Sur-mesure

**Site :** https://3beestudio.fr  
**Stack :** Next.js 15 · TypeScript · Tailwind CSS v4 · Stripe · Vercel · Supabase

---

## Démarrage

```bash
# Cloner le repo
git clone https://github.com/TON-USERNAME/3beestudio.git
cd 3beestudio

# Installer les dépendances
npm install

# Copier et remplir les variables d'environnement
cp .env.local.example .env.local
# → Remplir toutes les valeurs REMPLACER dans .env.local

# Lancer en développement (Turbopack)
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Stripe en développement

```bash
# Installer la CLI Stripe
brew install stripe/stripe-cli/stripe

# Écouter les webhooks en local
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Documentation

Toute la documentation du projet est dans `/docs` :

| Fichier | Contenu |
|---------|---------|
| `CLAUDE.md` | **Point d'entrée pour Claude** — lire en premier |
| `docs/project/01-vision.md` | Vision et modèle commercial |
| `docs/project/02-identite-visuelle.md` | Palette, typographie |
| `docs/project/03-produit-nfc.md` | Produit phare NFC B2B |
| `docs/project/04-site-structure.md` | Pages et parcours |
| `docs/project/05-stack-technique.md` | Architecture et dépendances |
| `docs/project/06-contenu-video.md` | TikTok, Bambu Lab, FFmpeg |
| `docs/project/07-marketing-kpis.md` | SEO, budget, KPIs |
| `docs/todo/TODO.md` | Tâches Sprint 1 |
| `docs/todo/ROADMAP.md` | Feuille de route complète |
| `docs/skills/SKILLS.md` | Skills techniques pour Claude |

## Déploiement

Push sur `main` → déploiement automatique sur Vercel.

```bash
git add .
git commit -m "feat: description"
git push origin main
```
