alter table shop_orders
  add column if not exists discount_amount integer not null default 0;
