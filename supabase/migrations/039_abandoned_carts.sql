-- Relance de panier abandonné.
--
-- Pourquoi une table à part plutôt qu'un statut `abandoned` sur `shop_orders` :
-- une session Stripe expirée déclenche `checkout.session.expired`, qui SUPPRIME
-- la commande fantôme (cf. `releaseExpiredCheckout` dans le webhook). Garder la
-- ligne en base sous un nouveau statut aurait fait apparaître des paniers jamais
-- payés dans le dashboard admin, le CA, les stats boutique et l'export CSV, qui
-- lisent tous `shop_orders` sans filtrer le statut. On prend donc un instantané
-- du panier au moment où la commande est effacée, dans sa propre table, avec sa
-- propre durée de conservation.
--
-- Contenu : le strict nécessaire pour reconstituer le panier et écrire un email.
-- Aucune adresse postale n'est reprise (elle n'a pas de finalité ici) et le
-- téléphone non plus.

create table if not exists abandoned_carts (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Commande d'origine, supprimée juste après l'instantané. Conservée pour
  -- rapprocher un log Stripe d'une relance, jamais utilisée comme clé étrangère
  -- (la ligne référencée n'existe plus).
  order_id uuid,

  -- Secret du lien de restauration envoyé par email. Non devinable : il donne
  -- accès au contenu du panier et pré-remplit le nom du client.
  token text not null unique,

  email  text not null,
  name   text,
  locale text not null default 'fr',

  -- Instantané des lignes (même forme que `shop_orders.items`). Les prix y sont
  -- figés pour l'email ; la restauration, elle, relit les prix courants en base.
  items jsonb not null default '[]'::jsonb,

  subtotal     integer not null default 0,
  total_amount integer not null default 0,

  -- Un seul email de relance par panier. `null` = pas encore relancé.
  reminded_at timestamptz,

  -- Posé quand une commande payée est repartie de ce panier (cf. confirmShopOrder).
  recovered_at timestamptz
);

-- Le cron ne lit que les paniers jamais relancés, dans une fenêtre de temps.
create index if not exists abandoned_carts_pending_idx
  on abandoned_carts (created_at)
  where reminded_at is null and recovered_at is null;

create index if not exists abandoned_carts_email_idx on abandoned_carts (email);

-- ── Opposition à la relance ─────────────────────────────────────────────────
--
-- Un email de relance n'est pas un email transactionnel : il doit porter un lien
-- de désinscription, et ce refus doit valoir pour les paniers suivants, pas
-- seulement pour celui en cours. D'où une table par email plutôt qu'un booléen
-- sur la ligne.

create table if not exists abandoned_cart_optouts (
  email      text primary key,
  created_at timestamptz not null default now()
);

-- ── Attribution ─────────────────────────────────────────────────────────────
--
-- Le jeton est transmis au checkout par le lien de l'email, puis figé sur la
-- commande : sans lui, impossible de distinguer un client revenu grâce à la
-- relance d'un client revenu de lui-même.

alter table shop_orders add column if not exists recovery_token text;

create index if not exists shop_orders_recovery_token_idx
  on shop_orders (recovery_token)
  where recovery_token is not null;

-- ── Purge ───────────────────────────────────────────────────────────────────
--
-- Un panier abandonné est une donnée personnelle collectée pour une seule
-- finalité, qui s'éteint avec la relance. 90 jours laissent le temps de mesurer
-- le taux de récupération sur un trimestre, sans conserver au-delà.
-- Les oppositions, elles, ne s'effacent pas : les purger reviendrait à relancer
-- quelqu'un qui a demandé à ne plus l'être.

create or replace function purge_abandoned_carts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted integer;
begin
  delete from abandoned_carts where created_at < now() - interval '90 days';
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;
