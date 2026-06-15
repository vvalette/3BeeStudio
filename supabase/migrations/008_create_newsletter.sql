create table if not exists newsletter_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  promo_used  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Seul le service role peut lire/écrire (jamais exposé côté client)
alter table newsletter_subscriptions enable row level security;

-- Aucune policy publique → accès service role uniquement
