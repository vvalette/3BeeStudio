-- Factures.
--
-- Table dédiée plutôt que des colonnes sur les trois tables de commandes : la
-- numérotation doit être **chronologique et continue pour toute l'entreprise**
-- (obligation comptable), pas par flux. Une séquence unique l'impose ici.
--
-- Les données imprimées sont figées dans la ligne : une facture réémise plus
-- tard doit être identique à celle envoyée, même si la commande a bougé depuis.

create table if not exists invoices (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),

  -- FAC-AAAA-NNN, unique sur toute la base
  number      text not null unique,
  issued_at   timestamptz not null default now(),
  paid_at     timestamptz,

  -- Commande d'origine. `source` évite toute collision d'uuid entre les tables.
  source      text not null check (source in ('nfc', 'shop', 'custom')),
  order_id    uuid not null,

  -- Instantané du destinataire et des lignes au moment de l'émission
  client_name        text not null,
  client_company     text,
  client_email       text not null,
  client_address     text,
  client_postal_code text,
  client_city        text,

  object       text not null,
  items        jsonb not null,
  adjustments  jsonb not null default '[]'::jsonb,
  total_amount integer not null,

  -- Une seule facture par commande : la garde d'idempotence quand l'email
  -- d'expédition est renvoyé.
  unique (source, order_id)
);

create index if not exists invoices_order_idx on invoices (source, order_id);
create index if not exists invoices_issued_at_idx on invoices (issued_at desc);

alter table invoices enable row level security;
-- Aucune policy : seule la service_role (côté serveur) y accède.

comment on table invoices is 'Factures émises — numérotation continue toutes sources confondues';
comment on column invoices.total_amount is 'Total TTC en centimes — doit égaler le montant réellement encaissé';
