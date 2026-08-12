# 🛍️ TODO — Canal Vinted (compte Vinted Pro)

> État au 12 août 2026. **Étude uniquement — rien n'est développé.**
> Contexte confirmé : objets imprimés 3BeeStudio vendus depuis un compte
> **Vinted Pro**. C'est le seul cas de figure qui rende l'intégration à la fois
> légitime (CA pro à déclarer) et techniquement ouverte (éligibilité API).

---

## 🧱 Constat structurel — les bordereaux ne sont pas générables

Sur Vinted, **c'est Vinted qui fabrique l'étiquette** : l'acheteur paie le port à
l'achat, Vinted a ses contrats transporteurs (Mondial Relay, Colissimo,
Chronopost) et fournit le PDF prêt à imprimer. La doc officielle de l'API le dit
explicitement (« Vinted creates the label »).

Conséquences non négociables :

- **Boxtal ne sert à rien sur ce canal.** Pas de tarif à calculer, pas
  d'étiquette à créer, pas de `boxtal_order_id`. Ne pas réutiliser
  [`src/lib/boxtal.ts`](../../src/lib/boxtal.ts) ici.
- Le maximum atteignable est de **récupérer** le PDF déjà fabriqué par Vinted
  (`GET /api/v1/orders/{id}/shipment-label`), et uniquement via l'API officielle.
- Le gain logistique réel se limite donc à « 1 clic chez moi au lieu de 3 dans
  l'app Vinted ». **La valeur du projet est ailleurs** (voir plus bas).

---

## 🔌 Les quatre voies d'accès aux commandes

| Voie | Ce qu'on récupère | Verdict |
|---|---|---|
| **API officielle Vinted Pro Integrations** | Commandes, statuts, tracking, PDF du bordereau, webhooks, sync stock bidirectionnelle | Propre, mais **allowlist fermée** |
| **Emails Vinted parsés** (Resend Inbound) | Date, article, montant | Faisable aujourd'hui, sur la stack existante |
| **Saisie manuelle dans l'admin** | Ce qu'on tape | 0 risque, ~20 s/vente |
| **API non officielle (cookies + scraping)** | Tout | ⛔ **Exclu** |

### API officielle — état réel

- Doc : <https://pro-docs.svc.vinted.com/> · Portail : <https://pro-portal.svc.vinted.com/>
- Auth **HMAC-SHA256** (pas OAuth) : en-têtes `X-Vpi-Access-Key` +
  `X-Vpi-Hmac-Sha256`, signature sur `timestamp.method.path.accessKey.body`.
- Endpoints utiles : `GET /api/v1/orders`, `GET /api/v1/orders/{id}`,
  `GET /api/v1/orders/{id}/shipment`, `GET /api/v1/orders/{id}/shipment-label`.
- Webhooks : `ORDER_CREATED`, `ITEM_SOLD`, `SHIPMENT_LABEL_CREATED`,
  `ORDER_CANCELLED`… (validation par `X-Vpi-Webhook-Hmac-Sha256`).
- Sandbox : `https://pro-public-sandbox.svc.vinted.com` + déclencheur de vente
  simulée `POST /dev/v1/triggers/item-sold/{itemID}`.
- France supportée ; catégories bien au-delà du textile (livres, jouets, jeux…).
- **Blocage** : « available only to a limited set of allowlisted Vinted Pro
  businesses », **aucun formulaire public de demande**. Cible = intégrateurs, pas
  vendeurs individuels. Départ à 500 slots d'articles actifs, extensible après
  30 j. Mapping des produits sur les ontologies Vinted requis.

### Scraping — pourquoi c'est exclu

Cookies de session + DataDome en face, IP datacenter Vercel bloquée d'emblée,
violation des CGU, risque de perte du compte Pro. Rapport risque/gain
inacceptable sur un compte qui génère du CA.

---

## 💰 Où est la valeur réelle

1. **URSSAF.** [L'export CSV](../../src/app/api/admin/export/route.ts) sort une
   ligne par commande sur 3 flux avec la colonne « Catégorie fiscale ». Vinted
   est le 4ᵉ flux et en est absent → l'export ne reflète pas le CA réel. Or
   Vinted déclare déjà ces revenus au fisc via **DAC7** : l'écart est visible
   côté administration.
2. **Stock.** Les mêmes objets partent sur la boutique *et* sur Vinted. La
   migration `028_decrement_shop_stock_oversell` protège la boutique de
   l'oversell, mais pas d'une vente Vinted survenue en parallèle.
3. **CA global.** Le dashboard `/admin/commandes` affiche Boutique / Sur-mesure /
   NFC et sous-estime le total tant que Vinted manque.

---

## 🪜 Plan retenu — trois paliers

### Palier 1 — le flux Vinted dans l'admin (~1 j) · *à faire en premier*

Indépendant de Vinted, donc jamais cassable par eux. **Les paliers 2 et 3
réutilisent tout tel quel** : seule l'ingestion changera, pas le stockage ni
l'affichage.

- [ ] Migration `031_vinted_orders.sql` — table `vinted_orders` :
      `vinted_order_id` (unique, nullable → dédoublonnage), `sold_at`,
      `item_title`, `product_id` (FK nullable vers `shop_products`),
      `gross_amount`, `commission_amount`, `net_amount` (centimes),
      `buyer_username`, `status`, `tracking_number`,
      `source` (`manual` | `email` | `api`), `raw` (jsonb).
- [ ] Type `src/types/vinted-order.ts`.
- [ ] 4ᵉ onglet dans
      [`AdminOrdersList.tsx`](../../src/components/admin/AdminOrdersList.tsx)
      (onglets ~l.282, stats ~l.229) + couleur dédiée.
- [ ] 4ᵉ requête + lignes dans l'export CSV (flux `Vinted`, catégorie
      `Marchandises`).
- [ ] Formulaire de saisie rapide (article, prix, commission, date) dans l'admin.

### Palier 2 — ingestion par email (~1 à 2 j)

- [ ] Resend **Inbound** (domaine `3beestudio.fr` déjà vérifié) : adresse de
      réception ou MX → webhook `email.received`.
      ⚠️ Le payload du webhook est **métadonnées seules** — le corps et les
      pièces jointes se récupèrent ensuite via la Receiving API.
- [ ] Règle de transfert dans la boîte mail sur les notifications Vinted
      (« ton article est vendu »).
- [ ] Route webhook + parseur + dédoublonnage sur `vinted_order_id`, écriture
      dans la table du palier 1, `source = 'email'`.
- [ ] Vérification de signature Svix (`svix-id` / `svix-timestamp` /
      `svix-signature`, fenêtre 5 min).

Limites assumées : casse si Vinted change ses templates ; ne donne ni adresse
acheteur ni bordereau.

### Palier 3 — API officielle, si l'accès est obtenu

- [ ] **Demander l'allowlist** à Vinted Pro (aucun formulaire public → passer par
      le support Vinted Pro depuis le compte). Éligible car compte Pro.
- [ ] Lib de signature HMAC-SHA256 + client API.
- [ ] Webhooks `ORDER_CREATED` / `ITEM_SOLD` → remplacent le parseur email.
- [ ] Proxy authentifié du PDF de bordereau dans l'admin.
- [ ] Sync stock bidirectionnelle avec `shop_products`.

---

## ⚠️ Vigilances

- **CA à déclarer = montant brut, pas le net viré.** En micro-entreprise, la
  commission Vinted (5 % + 0,30 €/article en Pro) est une charge **non
  déductible** : elle n'ampute pas le CA déclarable. Stocker les deux montants
  (`gross_amount` **et** `commission_amount`) et exporter le **brut**.
  *À faire confirmer par un comptable*, comme le reste des catégories fiscales.
- **Le port n'est pas du CA ici** : il est payé par l'acheteur à Vinted, jamais
  encaissé par le vendeur. Ne pas alimenter la colonne « Dont port » de l'export.
- **Factures.** Vinted produit un récapitulatif de ventes, **pas des factures
  conformes**. En Pro, c'est au vendeur de les émettre — piste de fonctionnalité
  une fois le palier 1 en place.
- **Ne pas mélanger** ventes pro et ventes perso d'occasion sur le même compte :
  aucun import automatique ne saurait les distinguer, et ça pollue le CA.

---

## ✅ Décisions prises

- **Boxtal exclu du canal Vinted** — il n'y a pas d'étiquette à générer.
- **Scraping / API non officielle exclus** — risque de perte du compte Pro.
- **Pas d'outil tiers** (VintedCRM, Vinteer, BaseLinker, ~15-30 €/mois) : ils
  résolvent la compta dans *leur* interface et recréent le double dashboard
  qu'on cherche justement à supprimer.
- **Ordre imposé** : palier 1 avant tout, car il est le seul indépendant de
  Vinted et sert de socle aux deux autres.
