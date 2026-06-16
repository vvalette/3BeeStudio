# 04 — Structure du Site

## Principe directeur
**Mobile-first absolu** — l'audience vient de TikTok/Instagram. Chaque page doit être parfaite sur écran 390px avant d'être adaptée desktop.

## Arborescence des Pages

```
3beestudio.fr/
├── /                            ← Accueil (landing complète)
├── /nfc                         ← Landing porte-clé connecté (produit phare)
├── /boutique                    ← Grille produits de série
│   └── /boutique/[slug]         ← Fiche produit
├── /sur-mesure                  ← Formulaire multi-step sur-mesure
├── /portfolio                   ← Galerie projets réalisés
├── /contact                     ← Formulaire de contact général
├── /suivi/[orderId]             ← Suivi commande client
├── /cgv                         ← Conditions Générales de Vente ✅
├── /mentions-legales            ← Mentions légales micro-entreprise ✅
└── /politique-de-confidentialite ← Politique RGPD ✅
```

## Navigation (Navbar)
- **Boutique** → `/boutique`
- **Porte-clé connecté** → `/nfc`
- **Sur-mesure** → `/sur-mesure`
- **Portfolio** → `/portfolio`
- CTA : **Nous contacter** → `/contact`

## Landing page `/` — sections dans l'ordre
1. `Hero` — headline, double CTA, trust strip
2. `NFCSection` — produit phare porte-clé connecté
3. `ProductsGrid` — boutique / pièces signature
4. `CustomCTA` — sur-mesure avec timeline 3 étapes
5. `VideoStrip` — TikTok / atelier
6. `Portfolio` — projets récents
7. `Testimonials` — avis clients
8. `NewsletterBlock` — Honey Drop
9. `SiteFooter` — liens, socials, légal

## Pages en détail

### 🏠 Accueil (`/`) ✅ implémentée

### 📱 Porte-clé connecté (`/nfc`)
- Mockup porte-clé animé
- Destinations NFC possibles (un lien au choix)
- Grille tarifaire volume (dès 5 pièces)
- Formulaire de devis multi-step (logo upload, URL, quantité)
- FAQ

### 🛒 Boutique (`/boutique`)
- Grille de produits, filtrée par catégorie
- Fiche produit : photos, matériau (PLA), délai, bouton Stripe
- Badge "Fabriqué en France"

### 🛠️ Sur-Mesure (`/sur-mesure`)
Formulaire 4 étapes :
1. Description du besoin
2. Dimensions approximatives
3. Upload fichiers (croquis, photo, .stl)
4. Coordonnées + acompte Stripe (50%)

### 🖼️ Portfolio (`/portfolio`)
- Grille masonry des projets réalisés
- Chaque projet : avant/après, matériau, délai, témoignage

### 📦 Suivi Commande (`/suivi/[orderId]`)
- Progression visuelle : Reçue → Design → Impression → Expédié
- Estimé de livraison + numéro de suivi transporteur

### 📬 Contact (`/contact`)
- Formulaire simple (nom, email, sujet, message)
- Réponse sous 24h

## Légal ✅

### CGV (`/cgv`)
- Rétractation 14 jours pour les produits de série
- **Pas de rétractation** pour sur-mesure et porte-clés connectés (Art. L221-28)
- Micro-entreprise : pas de TVA

### Mentions légales (`/mentions-legales`)
- Éditeur, hébergeur Vercel, propriété intellectuelle

### Politique de confidentialité (`/politique-de-confidentialite`)
- RGPD complet, droits utilisateurs, Stripe, cookies

## Roadmap future — option payante (abonnement)
- Fiche contact personnalisée multi-liens (digital business card) **hébergée par 3BeeStudio**
- Dashboard client pour gérer sa page, proposé en **option premium avec abonnement** (hébergement récurrent)
