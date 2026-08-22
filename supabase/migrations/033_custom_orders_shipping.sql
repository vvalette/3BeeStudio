-- Étiquette d'expédition Boxtal pour les projets sur-mesure.
--
-- Contrairement au NFC (poids déduit de la quantité) et à la boutique (poids
-- des articles en fiche produit), une pièce unique n'a pas de poids connu :
-- c'est l'admin qui déclare le colis au moment de créer l'étiquette. On garde
-- ce qu'il a déclaré pour que la fiche reste lisible après coup.

alter table custom_orders add column if not exists package_weight_grams integer;
alter table custom_orders add column if not exists package_length_cm    integer;
alter table custom_orders add column if not exists package_width_cm     integer;
alter table custom_orders add column if not exists package_height_cm    integer;

-- Coût réel de l'étiquette, connu seulement après création chez Boxtal
-- (l'API v3.1 n'a aucun endpoint de devis). Aligne le sur-mesure sur les
-- colonnes `shipping_cost` déjà présentes en NFC et boutique, et alimente la
-- colonne « coût étiquette » de l'export comptable.
alter table custom_orders add column if not exists shipping_cost integer;

comment on column custom_orders.shipping_cost is 'Coût de l''étiquette Boxtal en centimes, relevé après création';
comment on column custom_orders.package_weight_grams is 'Poids du colis déclaré par l''admin, en grammes';
