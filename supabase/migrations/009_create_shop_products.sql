-- Produits de la boutique
create table if not exists shop_products (
  id           uuid        default gen_random_uuid() primary key,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null,

  name         text        not null,
  slug         text        not null unique,
  description  text        not null default '',
  price        int         not null, -- centimes
  images       text[]      not null default '{}',
  stock        int,                  -- null = illimité
  active       boolean     not null default true,
  weight_grams int         not null default 100,

  stripe_product_id text,
  stripe_price_id   text
);

-- Index pour les requêtes publiques
create index if not exists shop_products_active_idx on shop_products (active);
create index if not exists shop_products_slug_idx   on shop_products (slug);

-- Trigger updated_at
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shop_products_updated_at on shop_products;
create trigger shop_products_updated_at
  before update on shop_products
  for each row execute function update_updated_at_column();

-- RLS : lecture publique des produits actifs, écriture réservée au service_role
alter table shop_products enable row level security;

create policy "Lecture publique produits actifs"
  on shop_products for select
  using (active = true);
