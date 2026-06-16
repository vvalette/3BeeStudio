alter table shop_products
  add column if not exists name_en        text,
  add column if not exists subtitle_en   text,
  add column if not exists description_en text;
