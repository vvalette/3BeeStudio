-- Date d'encaissement de l'acompte sur-mesure.
--
-- Jusqu'ici seul le statut `deposit_paid` disait que l'acompte était arrivé,
-- sans dire quand. Le solde avait déjà sa date (`balance_paid_at`) : les deux
-- encaissements sont maintenant traçables de la même façon, sur la fiche admin
-- comme sur la page de suivi client.
--
-- Pas de rattrapage sur les demandes déjà payées : la date est inconnue, et
-- inventer une valeur (`updated_at`, qui bouge à chaque édition) serait pire
-- que l'absence. L'affichage sait montrer « reçu » sans date.

alter table custom_orders add column if not exists deposit_paid_at timestamptz;

comment on column custom_orders.deposit_paid_at is 'Date d''encaissement de l''acompte — null sur les demandes antérieures à la migration 035';
