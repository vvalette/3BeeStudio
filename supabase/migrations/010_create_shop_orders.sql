-- Commandes passées via la boutique
create table if not exists shop_orders (
  id           uuid        default gen_random_uuid() primary key,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null,

  -- Client
  email        text        not null,
  name         text        not null,
  phone        text,

  -- Panier (snapshot au moment du paiement)
  items        jsonb       not null default '[]',
  -- Format : [{ product_id, product_name, quantity, unit_price }]

  -- Montants (centimes)
  subtotal     int         not null,
  shipping     int         not null default 490,
  total_amount int         not null,

  -- Statut
  status       text        not null default 'pending_payment',
  -- pending_payment | confirmed | processing | shipped | delivered | cancelled

  -- Adresse de livraison
  shipping_name         text,
  shipping_address      text,
  shipping_address2     text,
  shipping_city         text,
  shipping_postal_code  text,
  shipping_country      text default 'FR',

  -- Expédition
  tracking_number text,
  tracking_url    text,

  -- Admin
  admin_notes text,

  -- Stripe
  stripe_checkout_session_id text
);

create index if not exists shop_orders_status_idx on shop_orders (status);
create index if not exists shop_orders_email_idx  on shop_orders (email);

drop trigger if exists shop_orders_updated_at on shop_orders;
create trigger shop_orders_updated_at
  before update on shop_orders
  for each row execute function update_updated_at_column();

-- RLS : aucune lecture directe côté client (toujours via service_role)
alter table shop_orders enable row level security;
