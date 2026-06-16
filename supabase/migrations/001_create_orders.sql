-- Exécuter dans l'éditeur SQL de Supabase (Dashboard → SQL Editor)

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Client
  company text not null,
  email text not null,
  phone text not null,
  sector text not null,

  -- Commande
  quantity integer not null,
  nfc_url text not null,
  logo_url text not null,

  -- Prix (en centimes)
  unit_price integer not null,
  total_amount integer not null,
  deposit_amount integer not null,

  -- Statut
  status text not null default 'pending_payment',
  tracking_number text,
  admin_notes text,

  -- Stripe
  stripe_checkout_session_id text
);

-- Index sur email pour recherche rapide
create index on orders (email);
create index on orders (status);
create index on orders (stripe_checkout_session_id);

-- Mise à jour automatique de updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger orders_updated_at
  before update on orders
  for each row execute function update_updated_at();

-- RLS : ACTIVÉE sans aucune policy → deny-all pour anon/authenticated.
-- Seule la clé service_role (côté serveur uniquement) bypasse la RLS.
-- ⚠️ Ne JAMAIS désactiver : la clé anon est publique (présente dans le navigateur).
alter table orders enable row level security;
