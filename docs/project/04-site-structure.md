# 04 — Structure du Site

## Principe directeur
**Mobile-first absolu** — l'audience vient de TikTok/Instagram. Chaque page doit être parfaite sur écran 390px avant d'être adaptée desktop.

## Arborescence des Pages

```
3beestudio.fr/
├── /                     ← Accueil (vitrine + entrée tunnel)
├── /nfc                  ← Landing B2B porte-clés NFC (produit phare)
├── /boutique             ← Grille produits de série
│   └── /boutique/[slug]  ← Fiche produit
├── /sur-mesure           ← Formulaire multi-step sur-mesure
├── /portfolio            ← Galerie projets réalisés
├── /suivi/[orderId]      ← Suivi commande client
├── /cgv                  ← Conditions Générales de Vente
└── /mentions-legales     ← Mentions légales micro-entreprise
```

## Pages en détail

### 🏠 Accueil (`/`)
- **Hero** : accroche + double CTA
  - `Voir les porte-clés NFC` → `/nfc`
  - `Créer mon projet` → `/sur-mesure`
- Feed vidéo simulé (timelapses Bambu Lab)
- Produits vedettes (3-4 bestsellers)
- Section "Comment ça marche" — 4 étapes
- Section NFC teaser → lien `/nfc`

### 📱 NFC B2B (`/nfc`)
- Sélecteur destination NFC interactif
- Mockup porte-clé animé avec ondes NFC
- Grille tarifaire volume
- Formulaire de devis multi-step
- FAQ

### 🛒 Boutique (`/boutique`)
- Grille de produits, filtrée par catégorie
- Fiche produit : photos, matériau (PLA biodégradable), délai, bouton Stripe
- Badge "Fabriqué en France"

### 🛠️ Sur-Mesure (`/sur-mesure`)
Formulaire 4 étapes :
1. Description du besoin
2. Dimensions approximatives
3. Upload fichiers (croquis, photo, .stl)
4. Coordonnées + acompte Stripe

### 🖼️ Portfolio (`/portfolio`)
- Grille masonry des projets réalisés
- Chaque projet : avant/après, matériau, délai, témoignage

### 📦 Suivi Commande (`/suivi/[orderId]`)
- Progression visuelle : Reçue → Design → Impression → Expédié
- Estimé de livraison
- Numéro de suivi transporteur

## Légal

### CGV Série
- Rétractation 14 jours (Art. L221-18 Code conso)
- Remboursement sous 14j après retour

### CGV Sur-Mesure & NFC
- **Non-remboursement** dès début du travail de design
- Justification : produit hautement personnalisé (Art. L221-28)
- L'acompte est acquis définitivement au lancement de la modélisation

### Mentions Légales
- Statut : micro-entreprise
- Champs requis : SIRET, nom, adresse, email
- Hébergeur : Vercel Inc.
