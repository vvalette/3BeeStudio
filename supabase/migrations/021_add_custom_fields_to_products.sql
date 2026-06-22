-- Champs personnalisés demandés au client lors de l'achat (ex: prénom, nom à graver)
alter table shop_products
  add column if not exists custom_fields jsonb not null default '[]'::jsonb;
