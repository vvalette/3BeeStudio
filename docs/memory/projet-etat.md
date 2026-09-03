# État du projet — juin 2026

## Flux NFC (complet et fonctionnel ✅)

Formulaire multi-step : upload logo → sélecteur lien NFC → infos contact → récap → Stripe Checkout → email confirmation

- Paiement **intégral** (pas d'acompte) via Stripe Checkout Session
- Webhook `/api/stripe/webhook` : `checkout.session.completed` + `payment_intent.succeeded` (fallback)
- Sync Stripe direct dans `/suivi/[orderId]` si webhook lent (fallback race condition)
- Email confirmation automatique : Resend + template React Email, domaine `3beestudio.fr` vérifié
- **Statuts NFC harmonisés avec la boutique** (depuis juin 2026) : `pending_payment → confirmed → processing → shipped → delivered` (+ `cancelled`). Les anciens `printing`/`printed` ont été fusionnés dans `processing`. `shipped`/`delivered` pilotés auto par le webhook Boxtal. Le déclencheur "étiquette à générer" se base sur `processing` sans `boxtal_order_id`
  - From : `commandes@3beestudio.fr` / Reply-to : `contact@3beestudio.fr`
  - Header texte `🐝 3BeeStudio` (pas d'image logo — meilleure compatibilité email)

## Flux Sur-mesure / Custom (complet et fonctionnel ✅)

Formulaire multi-step : type de projet → description → budget → délai → contact → adresse → envoi

- URL : `/custom` (ancienne `/sur-mesure` redirige vers `/custom`)
- Paiement **acompte 50%** via Stripe Checkout Session (créé manuellement par l'admin), ou **par virement** : envoi sans lien, puis encaissement déclaré à la main sur la fiche (montant, date du relevé, moyen)
- Statuts : `pending_quote → quote_sent → deposit_paid → in_production → shipped → delivered → cancelled`
- Webhook `/api/stripe/webhook` : détecte `custom_order_id` + `type: 'custom_deposit'` dans metadata
- Deux emails automatiques à la soumission : confirmation client + notification admin interne
- Page suivi `/custom/[orderId]` avec timeline, détails projet, CTA paiement si devis envoyé
- **Devis** : composé dans l'admin (lignes → PDF généré) **ou importé** (PDF fabriqué ailleurs, téléversé dans le bucket privé `quotes`, joint tel quel). Un devis importé n'a pas de lignes : le total est déclaré à la main et l'email renvoie à la pièce jointe. Import possible sur la fiche (onglet « Importer un PDF ») comme dès la création dans `/admin/sur-mesure/nouveau`
- **Refus possible** : tous les projets ne sont pas réalisables — indiqué dans le formulaire

## Pages live

| Page | Statut |
|------|--------|
| `/` | ✅ Landing complète (Hero, NFC, CustomCTA, VideoStrip, Portfolio, Boutique overlay, Testimonials, Newsletter) |
| `/nfc` | ✅ Formulaire commande NFC multi-step |
| `/suivi/[orderId]` | ✅ Suivi NFC + timeline + prochaines étapes (affiché après `?payment=success`) |
| `/custom` | ✅ Formulaire sur-mesure multi-step (3 étapes) |
| `/custom/[orderId]` | ✅ Suivi sur-mesure + timeline + CTA paiement acompte |
| `/sur-mesure` | ✅ Redirect → `/custom` |
| `/cgv` | ✅ |
| `/mentions-legales` | ✅ |
| `/politique-de-confidentialite` | ✅ |
| `/admin/commandes` | ✅ Dashboard combiné NFC + sur-mesure (stats, tabs, filtres, tri, bulk delete) |
| `/admin/commandes/[id]` | ✅ Détail NFC + changement statut + Boxtal + notes |
| `/admin/custom/[orderId]` | ✅ Détail sur-mesure + changement statut + envoi devis Stripe + notes |
| `/admin/boutique/audience` | ✅ Consultations des fiches produit : entonnoir vues → paniers → ventes, fenêtres 7/30/90 j |
| `/admin/boutique/promos` | ✅ Codes promo : %, montant fixe, livraison gratuite + conditions et plafonds |
| `/boutique` | 🚧 Placeholder Phase 2 (overlay "bientôt disponible" sur la landing) |
| `/portfolio` | 🚧 Placeholder Phase 2 |
| `/contact` | 🚧 Placeholder Phase 2 |

## API routes

| Route | Rôle |
|-------|------|
| `POST /api/nfc/order` | Crée commande NFC Supabase + session Stripe (paiement intégral) |
| `POST /api/stripe/webhook` | Confirme paiement NFC ou acompte custom + envoie email |
| `POST /api/nfc/verify-link` | Vérifie URL/profil NFC (best-effort) |
| `POST /api/upload/logo` | Upload logo vers Supabase Storage (bucket `logos`) |
| `POST /api/custom/order` | Crée demande sur-mesure Supabase + emails confirmation/admin |
| `POST /api/custom/[orderId]/quote` | Admin : crée session Stripe acompte + email client (auth header `x-admin-password`) |
| `POST /api/admin/custom/[orderId]/payment` | Déclare (ou annule) un encaissement reçu hors Stripe : acompte ou solde, montant, date, moyen |
| `POST/DELETE /api/admin/custom/[orderId]/quote-file` | Téléverse ou retire un devis PDF importé (bucket privé `quotes`, auth cookie) |
| `GET/POST /api/admin/custom/[orderId]/quote-pdf` | Devis envoyé (ou PDF importé) / aperçu du brouillon (auth cookie) |
| `GET /api/admin/orders` | Liste commandes NFC (auth cookie) |
| `PATCH /api/admin/orders/[id]` | Met à jour statut/notes NFC (auth cookie) |
| `DELETE /api/admin/orders/[id]` | Supprime commande NFC (auth cookie) |
| `POST /api/admin/orders/[id]/ship` | Génère étiquette Boxtal (NFC) |
| `PATCH /api/admin/custom/[orderId]` | Met à jour statut/notes/suivi sur-mesure (auth cookie) |
| `DELETE /api/admin/custom/[orderId]` | Supprime demande sur-mesure (auth cookie) |
| `POST /api/boutique/checkout` | Crée commande boutique + session Stripe (livraison/retrait, locale, réduction newsletter) |
| `PATCH /api/admin/boutique/orders/[id]` | Met à jour statut/suivi/notes boutique (auth cookie) |
| `POST /api/admin/boutique/orders/[id]/ship` | Génère étiquette Boxtal (boutique) |
| `POST /api/boxtal/webhook` | Suivi auto Boxtal → met à jour `orders` ET `shop_orders` |
| `POST /api/boutique/view` | Compte une consultation de fiche produit (beacon, robots et admin exclus) |
| `POST /api/boutique/promo` | Valide un code promo et renvoie la remise (aperçu checkout, ne consomme rien) |
| `GET/POST /api/admin/boutique/promos` | Liste et création des codes promo (auth cookie) |
| `PATCH/DELETE /api/admin/boutique/promos/[id]` | Modification, désactivation ou suppression d'un code |
| `GET /api/cron/analytics-retention` | Purge audience : empreintes 45 j, statistiques 13 mois (lundi 4 h) |
| `GET /api/test-email` | ⚠️ Diagnostic — supprimer avant prod |

## Infrastructure

- **Supabase** : tables `orders` (NFC) + `custom_orders` (sur-mesure) + `shop_orders` (boutique) + `newsletter_subscriptions`, RLS activé sur `custom_orders`
  - Migrations appliquées manuellement dans le SQL editor Supabase (connexion directe IPv6 KO depuis WSL → `npm run migrate` inutilisable)
  - **Migrations boutique en attente** (à coller dans SQL editor) : `016` delivery_mode, `017` locale, `018` discount_amount, `019` boxtal_order_id, `020` harmonisation statuts NFC (`update orders set status='processing' where status in ('printing','printed')`)
- **Resend** : domaine `3beestudio.fr` vérifié, `RESEND_FROM_EMAIL=commandes@3beestudio.fr`
- **Stripe** : mode test actif, webhook gère NFC (paiement intégral) et custom (acompte 50%)
- **Dev** : port `3001` (`npm run dev`)
- **Stripe CLI en dev** : `stripe listen --forward-to localhost:3001/api/stripe/webhook`
- **Build parallèle** : `NEXT_BUILD_DIR=.next-build npm run build` si dev server actif

## Emails templates

| Fichier | Usage |
|---------|-------|
| `src/emails/OrderConfirmation.tsx` | Confirmation paiement NFC |
| `src/emails/CustomOrderConfirmation.tsx` | Confirmation demande sur-mesure (client) |
| `src/emails/CustomOrderAdmin.tsx` | Notification interne nouvelle demande sur-mesure |

Tous les headers email utilisent du **texte** (`🐝 3BeeStudio`) — pas d'image PNG (meilleure compatibilité).

## Admin — fonctionnalités

- **Codes promo** (`/admin/boutique/promos`) : trois types (pourcentage, montant fixe, livraison gratuite), conditions (minimum d'achat, objets/fichiers, plafond d'usages, une fois par client, dates), compteur d'utilisations et coût réel par code. Un code déjà utilisé est désactivé et non supprimé, pour garder l'historique lisible
- **Audience boutique** (`/admin/boutique/audience`) : vues, visiteurs, ajouts panier et taux de conversion par produit, fenêtres 7/30/90 j, tendance vs période précédente. Répond à « ce produit ne se vend pas : est-il invisible, ou décevant ? » — deux corrections opposées. Repère de vues 30 j aussi sur chaque ligne de `/admin/boutique`
- **Dashboard combiné** : stats globales (commandes, CA, en production, étiquettes) cumulant NFC + sur-mesure
- **Période** : filtre semaine / mois / année / tout
- **Tabs** : section NFC distincte | section Sur-mesure distincte
- **Filtres** : "À traiter" par défaut (exclut les livrées/annulées), puis par statut
- **Tri** : plus récente / plus ancienne / nom A→Z / nom Z→A / montant ↓
- **Sélection** : checkboxes custom (14×14px amber) + "Tout sélectionner"
- **Suppression** : individuelle (icône hover) + bulk (bouton rouge sur sélection)
