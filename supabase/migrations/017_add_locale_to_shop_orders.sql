alter table shop_orders
  add column if not exists locale text not null default 'fr';
