# 03 — Produit Phare : Porte-Clé Connecté

> **Terminologie officielle sur le site :** "porte-clé connecté" (pas "NFC B2B").
> L'URL reste `/nfc`. Le terme NFC est gardé dans les métadonnées SEO.

## Concept
Porte-clé imprimé en 3D avec logo client + **languette NFC NTAG213** programmée.
Approcher un smartphone ouvre instantanément le lien choisi par le client.

**Argument clé : l'URL est modifiable à tout moment sans refaire le porte-clé.**

## Destinations possibles (une seule à la fois)
- Profil Instagram, TikTok ou LinkedIn
- Site web ou portfolio
- Numéro de téléphone (`tel:`)
- Email (`mailto:`)
- Tout autre lien HTTPS

> **Roadmap Phase 3** : page dédiée multi-liens (type digital business card) hébergée par 3BeeStudio,
> permettant de regrouper plusieurs liens sur une même page et de les modifier depuis un dashboard.

## Composants & Coûts

| Composant | Coût unitaire | Source |
|-----------|--------------|--------|
| Filament PLA (corps) | ~0,30€ | Stock atelier |
| Puce NFC NTAG213 | 0,20€ – 0,50€ | Lots de 100 sur Amazon/AliExpress |
| Programmation NFC | 0€ (app NFC Tools, 10s/unité) | Android |
| Impression logo | inclus | Bambu Lab |

**Coût de revient total : ~1€/unité** à 100 unités

## Pricing (HT, micro-entreprise — pas de TVA)

| Quantité | Prix/unité | Total | Marge brute |
|----------|-----------|-------|-------------|
| 10 u | 18€ | 180€ | ~94% |
| 50 u | 14€ | 700€ | ~93% |
| 100 u | 11€ | 1 100€ | ~91% |
| 250+ u | 9€ | 2 250€+ | ~89% |

Setup logo si vectorisation nécessaire : **35€ one-time**

## Outils NFC

| Outil | Usage | Coût |
|-------|-------|------|
| NFC Tools (Android) | Programmer les puces | Gratuit |
| NFC Tools Pro | Programmer en série, templates | 6€ one-time |

**Process de programmation :**
1. Ouvrir NFC Tools sur Android
2. "Écrire" → "Ajouter un enregistrement" → URL
3. Approcher la puce du téléphone → programmé en 3 secondes
4. Tester avec un autre téléphone

## Acquisition (sans budget)

**Cibles prioritaires :**
- Restaurants, cafés, food trucks
- Salons de coiffure / beauté / bien-être
- Agences immobilières, artisans, boutiques locales
- Tout secteur où le contact client est fréquent

**Tactiques :**
1. Offrir 5 unités gratuites à un premier client influent → ambassadeur naturel
2. Vidéos TikTok "regarde ce que j'ai fabriqué pour [secteur]" → leads B2B organiques
3. Démarche directe LinkedIn + email avec démo vidéo
4. Partenariat apporteur d'affaires avec agences de communication locales

## Page Dédiée sur le Site (`/nfc`)
1. Mockup porte-clé avec logo + visuel téléphone (démo tap)
2. Liste des destinations possibles
3. Grille tarifaire volume
4. Formulaire de devis (entreprise, secteur, quantité, logo upload, URL cible)
5. Logos clients dès premières références
6. FAQ : "Et si je change de réseau social ?" / "Compatible tous téléphones ?"
