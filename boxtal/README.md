# Boxtal — références d'intégration

À lire **avant** toute modification du code d'expédition ([`src/lib/boxtal.ts`](../src/lib/boxtal.ts)).

| Fichier | Contenu |
|---|---|
| [`api-v3.json`](api-v3.json) | Spec OpenAPI officielle v3.1 (11 endpoints) |
| [`shipping-offer-codes.md`](shipping-offer-codes.md) | Catalogue des 74 codes d'offres, lisible |
| [`shipping-offer-codes.json`](shipping-offer-codes.json) | Même catalogue, exploitable par script (`kind`, `scope`) |

## Ce que l'API ne fait pas

Vérifié le 10 août 2026 sur la spec **et** en live sur `api.boxtal.build` :

- **Aucun endpoint de devis.** `shipping-offer`, `quote`, `rate`, `pricing`, `cotation` → tous 404. La description de l'API n'annonce que 4 capacités : chercher des points relais, commander une offre, récupérer les étiquettes, récupérer le suivi.
- **Le prix n'est connu qu'après création** : `GET /shipping/v3.1/shipping-order/{id}` → `deliveryPriceExclTax`. C'est ce qu'on enregistre dans `shipping_cost`.
- **Impossible de lister les offres du contrat.** Un code non souscrit renvoie `NoShippingOfferException` sans détail ; un réseau invalide renvoie `ValidationException` sans énumération. Seul le tableau de bord Boxtal fait foi.

Conséquence : « prendre automatiquement le moins cher » **n'est pas réalisable** par comparaison de prix. La stratégie retenue est une liste ordonnée du moins cher au plus cher, avec repli quand une offre est refusée (`offerCodesFor()`).

## Choix des offres

Pilotées par variables d'environnement, sans redéploiement — voir [`.env.local.example`](../.env.local.example).

- **Domicile** (`BOXTAL_HOME_OFFER_CODES`) : liste ordonnée avec repli automatique. Aucun code de point n'entre en jeu, le repli est sans risque.
- **Point relais** (`BOXTAL_RELAY_OFFER_CODE`) : **une seule offre, pas de repli**. Le `pickupPointCode` stocké sur la commande appartient au réseau interrogé par le sélecteur ; basculer vers un autre transporteur enverrait un code de point qu'il ne connaît pas. Ce code pilote à la fois le sélecteur et l'expédition.
