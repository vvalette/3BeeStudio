# 🗺️ Roadmap 3BeeStudio

```
PHASE 1          PHASE 2          PHASE 3          PHASE 4
Mois 1-2         Mois 3-4         Mois 5-6         Mois 7+
─────────        ─────────        ─────────        ─────────
Lancer           Optimiser        Automatiser      Scaler
manuellement     le contenu       la chaîne        le business
0€/mois          8€/mois          30€/mois         50€/mois
```

---

## 🟡 PHASE 1 — Lancer (Mois 1-2)
> Objectif : Premiers clients, premiers euros, premières vidéos

### Site & Technique
- [ ] `npx create-next-app@latest` avec Next.js 15 + TypeScript + Tailwind
- [ ] Setup repo GitHub + déploiement Vercel (gratuit)
- [ ] Pointer domaine 3beestudio.fr sur Vercel
- [ ] Configurer variables d'environnement (.env.local)
- [ ] Installer toutes les dépendances (voir `05-stack-technique.md`)
- [ ] Page d'accueil responsive complète
- [ ] Page `/nfc` — landing B2B porte-clés
- [ ] Formulaire de devis NFC simple (sans multi-step pour commencer)
- [ ] 3-5 fiches produits de série avec Stripe Checkout
- [ ] Pages CGV + Mentions légales
- [ ] Emails transactionnels Resend (confirmation commande)

### Produit NFC
- [ ] Commander 100 puces NFC NTAG213 (~25€)
- [ ] Installer NFC Tools sur Android
- [ ] Créer 2-3 prototypes porte-clé avec logo 3BeeStudio
- [ ] Filmer démo NFC 10 secondes (vidéo de vente)
- [ ] Démarcher 5 entreprises locales avec échantillons gratuits

### Contenu
- [ ] Activer timelapse Bambu Studio sur chaque impression
- [ ] Créer template CapCut réutilisable (logo + format 9:16)
- [ ] Poster 1ère vidéo TikTok + Reel (même imparfaite)
- [ ] Objectif : 1 vidéo/semaine minimum

**Budget fixe : 0€/mois**

---

## 🟠 PHASE 2 — Optimiser (Mois 3-4)
> Objectif : Publier plus vite, mieux convertir

### Site
- [ ] Multi-step form sur-mesure complet + upload fichiers (Vercel Blob)
- [ ] Stripe acomptes pour NFC et sur-mesure
- [ ] Page portfolio / galerie
- [ ] Page suivi commande `/suivi/[orderId]`
- [ ] Intégration timelapses sur la page d'accueil
- [ ] SEO : meta titles/descriptions optimisés

### Contenu
- [ ] Passer à 3 vidéos/semaine
- [ ] Activer sous-titres automatiques (TikTok natif ou CapCut)
- [ ] Tester formats : timelapse / reveal / démo NFC / coulisses
- [ ] Analyser TikTok Analytics : quels formats convertissent
- [ ] Buffer free plan pour programmer les posts

### NFC B2B
- [ ] Formulaire de devis volume en ligne
- [ ] PDF commercial envoyable par email
- [ ] Créer tableau suivi clients NFC (Notion)
- [ ] Premiers témoignages clients collectés

**Budget fixe : ~8€/mois (CapCut Pro)**

---

## 🔴 PHASE 3 — Automatiser (Mois 5-6)
> Objectif : La chaîne vidéo tourne sans intervention

### Pipeline Vidéo Auto
- [ ] Installer FFmpeg + script Python `process_timelapse.py`
- [ ] Configurer Make (3 scénarios, 9€/mois)
- [ ] Connecter Google Drive → Make → script → Buffer
- [ ] Connecter Buffer (6€/mois) à TikTok et Instagram
- [ ] Tester le pipeline complet de bout en bout
- [ ] Publication automatique à 18h tous les jours

### Emails Automatiques
- [ ] 5 emails transactionnels configurés dans Resend
- [ ] Email J+7 livraison pour programme photo client

### NFC Pro
- [ ] NFC Tools Pro (6€) pour programmer en série
- [ ] Portail client simple pour modifier leur URL NFC
- [ ] QR code de secours dans chaque colis

**Budget fixe : ~30€/mois (Make + Buffer + Epidemic Sound)**

---

## 🟣 PHASE 4 — Scaler (Mois 7+)
> Objectif : Augmenter CA sans augmenter le temps de travail

### Monétisation Contenu
- [ ] Postuler TikTok Creativity Program (dès 10k abonnés)
- [ ] Instagram Bonus Reels (sur invitation)
- [ ] Premiers sponsors potentiels (marques filament, etc.)

### Business
- [ ] Analytics avancés (Plausible, 9€/mois)
- [ ] Investir dans 2ème imprimante Bambu Lab
- [ ] CMS Sanity pour gérer produits sans coder
- [ ] Viser franchises et réseaux B2B pour NFC volume

### Nouvelles lignes
- [ ] Collection en édition limitée (crée la rareté)
- [ ] Kits de pièces complémentaires (upsell)
- [ ] Partenariat agences de communication (apporteurs d'affaires)

**Budget fixe : ~50€/mois**

---

## Roadmap NFC Spécifique

### Phase 1 — Prototype & Premiers clients
- [ ] Commander 100 puces NTAG213 (~25€ le lot)
- [ ] Installer NFC Tools sur Android
- [ ] Créer 3 coloris de démo avec logo 3BeeStudio
- [ ] Filmer démo NFC 10s pour TikTok/Reels
- [ ] Démarcher 5 entreprises locales avec échantillons

### Phase 2 — Systématiser
- [ ] Formulaire devis volume (quantité, logo upload, URL NFC)
- [ ] Grille tarifaire affichée publiquement
- [ ] PDF commercial envoyable
- [ ] Vidéo TikTok "en train de fabriquer pour [secteur]"

### Phase 3 — Automatiser la programmation
- [ ] NFC Tools Pro (6€) pour programmer en série
- [ ] Tableau Notion : client / destination / date livraison
- [ ] QR code de secours dans chaque colis

### Phase 3 bis — Option payante : Fiche contact hébergée (abonnement) 💰
> Fonctionnalité premium distincte du porte-clé standard. **Ne pas promettre la modification d'URL
> sur l'offre de base** — c'est précisément la valeur ajoutée de cette option payante.
- [ ] **Fiche contact multi-liens** hébergée par 3BeeStudio (type Linktree de marque) — le porte-clé
      pointe vers `3beestudio.fr/c/xxx` qui regroupe Instagram, email, téléphone, site, etc.
- [ ] Dashboard client pour éditer sa page (logo, liens, couleurs)
- [ ] **Modèle d'abonnement** : facturation récurrente couvrant l'hébergement + l'édition illimitée
- [ ] Page publique responsive + bouton « Ajouter aux contacts » (vCard générée)
- [ ] Slug personnalisé / nom de domaine de marque (option)

### Phase 4 — Volume
- [ ] Cibler franchises, chaînes de restaurants, réseaux d'agences
- [ ] Contrat maintenance annuel (lié à l'option fiche contact hébergée)
- [ ] Partenariat agences communication locales
- [ ] Variantes : badge NFC, porte-badge, support bureau NFC

---

## Règle d'or
> **N'automatise que ce que tu fais déjà régulièrement à la main.**
> Automatiser trop tôt = complexité inutile.
> Automatiser au bon moment = libère du temps pour créer.
