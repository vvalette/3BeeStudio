create table if not exists shop_categories (
  id          uuid        default gen_random_uuid() primary key,
  created_at  timestamptz default now() not null,
  key         text        not null unique,
  label       text        not null,
  label_en    text,
  sort_order  int         not null default 0
);

-- Seed avec les catégories existantes
insert into shop_categories (key, label, label_en, sort_order) values
  ('maison', 'Maison & Déco',         'Home & Decor',       0),
  ('cadeau', 'Cadeaux personnalisés', 'Personalised Gifts', 1)
on conflict (key) do nothing;

alter table shop_categories enable row level security;

create policy "Lecture publique catégories"
  on shop_categories for select using (true);
