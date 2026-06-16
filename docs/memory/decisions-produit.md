# Décisions produit — à ne pas remettre en question sans raison

## NFC — pas de promesse d'URL modifiable

La destination NFC (URL ou vCard) est **fixée à la commande**.
Modifier la destination après fabrication = option payante hébergée (Phase 3) via `3beestudio.fr/c/xxx`.

Ne jamais laisser entendre sur le site ou dans les emails que le client pourra changer son lien librement.

## Flux de paiement NFC = intégral, pas d'acompte

Le flux NFC utilise un **paiement intégral** via Stripe Checkout Session.

## Flux de paiement Sur-mesure = acompte 50%

Le flux custom utilise un **acompte 50%** créé manuellement par l'admin après étude du projet.
- L'admin saisit le montant dans `/admin/custom/[orderId]` → Stripe Checkout Session créée → email client
- Le solde est réglé à la livraison (hors plateforme pour l'instant)
- Metadata Stripe : `{ custom_order_id, type: 'custom_deposit' }`

## Sur-mesure — refus possible

Tous les projets ne sont pas réalisables en impression 3D.
L'atelier **se réserve le droit de refuser** une demande si elle dépasse les capacités ou sort de l'activité.
Ce point est affiché explicitement dans le formulaire (warning rouge discret).

## Sur-mesure — tarification dégressive

La première pièce couvre la conception + mise au point (coût unitaire plus élevé).
Une fois le fichier prêt, il appartient au client : relancer une série revient bien moins cher par pièce.
Ce point est mis en avant dans la colonne info de `/custom`.

## URL sur-mesure = `/custom`

La page formulaire sur-mesure est à `/custom` (pas `/sur-mesure`).
`/sur-mesure` redirige vers `/custom` (redirect Next.js).
Même logique pour le suivi : `/custom/[orderId]` (pas `/suivi-mesure/[orderId]`).

## Admin custom — pas de Boxtal

Les commandes sur-mesure n'ont pas d'intégration Boxtal.
Le numéro de suivi est saisi manuellement dans `/admin/custom/[orderId]`.

## Langue

Le site est actuellement en **français**. Une version anglaise est prévue — ne pas hardcoder de chaînes non-extractibles, anticiper l'i18n sans l'implémenter maintenant.

## Livrable toujours physique

Aucun fichier numérique vendu. Le produit est toujours un objet imprimé en 3D livré physiquement.
