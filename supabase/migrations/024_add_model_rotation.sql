alter table shop_products
  add column if not exists model_rotation jsonb not null default '{"x":0,"y":0,"z":0}'::jsonb;
