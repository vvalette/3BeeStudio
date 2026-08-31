# 03 — Produit Phare : Porte-Clé Connecté

> **Terminologie officielle sur le site :** "porte-clé connecté" (pas "NFC B2B").
> L'URL reste `/nfc`. Le terme NFC est gardé dans les métadonnées SEO.

## Concept
Porte-clé imprimé en 3D avec logo client + **languette NFC NTAG213** programmée.
Approcher un smartphone ouvre instantanément le lien choisi par le client.

**Argument clé : un seul geste (tap) remplace QR code, carte de visite et saisie manuelle.**

## Destinations possibles (une seule à la fois)
- Profil Instagram, TikTok ou LinkedIn
- Site web ou portfolio
- **Fiche contact (vCard)** : nom + téléphone et/ou email écrits sur la puce → « Ajouter aux contacts » au tap
  (téléphone et email seuls ont été retirés : la fiche contact les remplace avantageusement)
- Tout autre lien HTTPS

> **Contrainte technique vCard** : la puce NTAG213 ne stocke que ~132 octets utiles. Le formulaire affiche
> un compteur d'octets en direct et bloque la commande si la fiche dépasse. Au-delà → orienter vers la
> future option « fiche contact hébergée » (premium).

> **Option payante (roadmap)** : fiche contact personnalisée multi-liens (type digital business card)
> **hébergée par 3BeeStudio** — regroupe plusieurs liens (Instagram, email, téléphone, site…) sur une
> page de marque, modifiable depuis un dashboard client. Proposée en **option premium avec abonnement**
> (coût d'hébergement récurrent). Voir [ROADMAP](../todo/ROADMAP.md).

## Composants & Coûts

| Composant | Coût unitaire | Source |
|-----------|--------------|--------|
| Filament PLA (corps) | ~0,30€ | Stock atelier |
| Puce NFC NTAG213 | 0,20€ – 0,50€ | Lots de 100 sur Amazon/AliExpress |
| Programmation NFC | 0€ (app NFC Tools, 10s/unité) | Android |
| Impression logo | inclus | Bambu Lab |

**Coût de revient total : ~1€/porte-clé** à 100 unités

## Pricing (HT, micro-entreprise — pas de TVA)

> **Logique de prix** : cible ~**0,50 € net/porte-clé** dans la poche au gros volume.
> Net ≈ prix × (1 − ~13 % charges micro) − ~1 € de coût de revient.
> Le setup logo (35 € vectorisation) est facturé en plus si nécessaire.

### Frais de port (facturés en plus, inclus dans le total)
| Quantité | Port |
|----------|------|
| 5–99 | 6,90 € |
| **100+** | **Offert** |

Le port est ajouté au sous-total ; le client règle le **total intégral** (port compris) à la commande.

| Quantité | Prix/porte-clé | Total | Net estimé /pc |
|----------|---------------|-------|----------------|
| 5–9 | 2,90 € | dès 14,50 € | ~1,52 € |
| 10–49 | 2,50 € | dès 25 € | ~1,18 € |
| 50–99 | 2,20 € | dès 110 € | ~0,91 € |
| 100–249 | 1,90 € | dès 190 € | ~0,65 € |
| 250+ | 1,70 € | dès 425 € | ~0,48 € |

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
6. FAQ : "Compatible tous téléphones ?" / "Comment fonctionne la puce NFC ?"
