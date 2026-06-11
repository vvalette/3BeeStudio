-- Table des commandes sur-mesure
create table if not exists custom_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Client
  name text not null,
  company text,
  email text not null,
  phone text not null,

  -- Projet
  project_type text not null,
  description text not null,
  budget_range text not null,
  deadline text not null,

  -- Statut
  status text not null default 'pending_quote',
  admin_notes text,

  -- Devis & paiement (rempli par l'admin)
  deposit_amount integer,
  total_amount integer,
  payment_url text,
  stripe_checkout_session_id text,

  -- Adresse de livraison
  shipping_name text,
  shipping_address text,
  shipping_city text,
  shipping_postal_code text,

  -- Expédition
  tracking_number text,
  tracking_url text,
  boxtal_order_id text
);

-- Index pour les recherches admin
create index if not exists custom_orders_email_idx   on custom_orders (email);
create index if not exists custom_orders_status_idx  on custom_orders (status);
create index if not exists custom_orders_created_idx on custom_orders (created_at desc);

-- Mise à jour automatique de updated_at
create or replace function update_custom_orders_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger custom_orders_updated_at
  before update on custom_orders
  for each row execute procedure update_custom_orders_updated_at();

-- RLS : bloquage total par défaut, seul le service_role peut lire/écrire
alter table custom_orders enable row level security;
