alter table shop_products
  add column if not exists category text,
  add column if not exists featured boolean not null default false;

create index if not exists shop_products_category_idx on shop_products (category);
create index if not exists shop_products_featured_idx on shop_products (featured);
