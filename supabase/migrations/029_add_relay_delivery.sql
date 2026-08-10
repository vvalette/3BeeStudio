-- Livraison en point relais + coût réel d'expédition
--
-- Contexte : l'offre Boxtal était codée en dur sur POFR-ColissimoAccess
-- (~11 € par colis). Le point relais Mondial Relay revient à ~5 €, mais l'API
-- Boxtal impose un `pickupPointCode` sur l'expédition — le client doit donc
-- choisir son relais au moment de la commande.
--
-- delivery_mode accepte désormais une 3e valeur :
--   'delivery' = livraison à domicile
--   'pickup'   = retrait en studio (gratuit, sans adresse)
--   'relay'    = point relais (adresse du relais, moins cher)
-- Pas de contrainte CHECK sur la colonne (migration 016) → rien à modifier
-- côté contrainte, la validation est faite côté applicatif (zod).

alter table shop_orders
  add column if not exists pickup_point_code        text,
  add column if not exists pickup_point_name        text,
  add column if not exists pickup_point_street      text,
  add column if not exists pickup_point_city        text,
  add column if not exists pickup_point_postal_code text;

-- Coût réel facturé par Boxtal pour l'étiquette, en centimes (deliveryPriceExclTax).
-- Renseigné après génération de l'étiquette : l'API v3 n'expose aucun devis
-- avant commande, le prix n'est connu qu'a posteriori. Permet de comparer ce
-- qu'on facture au client (shipping) à ce que l'expédition coûte réellement.
alter table shop_orders
  add column if not exists shipping_cost integer;

alter table orders
  add column if not exists shipping_cost integer;

comment on column shop_orders.pickup_point_code is
  'Code Boxtal du point relais choisi par le client (Shipment.pickupPointCode)';
comment on column shop_orders.shipping_cost is
  'Coût réel HT de l''étiquette Boxtal en centimes — null tant qu''aucune étiquette n''est générée';
comment on column orders.shipping_cost is
  'Coût réel HT de l''étiquette Boxtal en centimes — null tant qu''aucune étiquette n''est générée';
