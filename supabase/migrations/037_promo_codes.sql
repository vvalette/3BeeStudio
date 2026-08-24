-- Codes promo de la boutique.
--
-- Pourquoi une table maison plutôt que les Promotion Codes de Stripe : le port
-- est calculé chez nous (`calcShopShipping`) et passé à Stripe comme
-- `shipping_options`, pas comme une ligne de panier. Un coupon Stripe ne peut
-- donc pas produire « livraison gratuite » — c'est le cas d'usage principal.
-- Garder la règle ici permet aussi d'afficher la réduction AVANT de partir sur
-- Stripe, et de la restreindre (montant minimum, objets vs fichiers, un seul
-- usage par email), ce que le champ code de Stripe ne sait pas faire seul.
--
-- Le coupon Stripe reste utilisé, mais en one-shot créé à la volée au moment du
-- paiement — exactement comme la réduction newsletter existante.

-- ── Codes ───────────────────────────────────────────────────────────────────

create table if not exists promo_codes (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Toujours stocké en MAJUSCULES : le client tape « bienvenue10 », la casse ne
  -- doit jamais être la raison d'un code refusé.
  code text not null unique,

  --   percent       → `value` = pourcentage de remise (1 à 100)
  --   amount        → `value` = remise en centimes
  --   free_shipping → `value` ignoré, les frais de port tombent à 0
  type  text not null check (type in ('percent', 'amount', 'free_shipping')),
  value integer not null default 0,

  active     boolean not null default true,
  starts_at  timestamptz,
  ends_at    timestamptz,

  -- null = illimité. `uses` est incrémenté par la RPC, jamais à la main.
  max_uses int,
  uses     int not null default 0,

  -- Empêche un même client de rejouer un code de bienvenue à chaque commande.
  once_per_email boolean not null default false,

  -- Montant minimum de panier (centimes) pour que le code s'applique.
  min_subtotal integer not null default 0,

  --   all      → tout le panier
  --   physical → part objets uniquement
  --   digital  → part fichiers uniquement
  applies_to text not null default 'all' check (applies_to in ('all', 'physical', 'digital')),

  -- Mémo interne (« opération Instagram septembre »), jamais montré au client.
  note text,

  -- Un pourcentage hors [1,100] ou un montant à 0 produirait une remise absurde
  -- ou nulle : autant l'interdire à l'écriture plutôt que de le découvrir au
  -- checkout d'un client.
  constraint promo_codes_value_check check (
    (type = 'percent'       and value between 1 and 100) or
    (type = 'amount'        and value > 0) or
    (type = 'free_shipping')
  ),
  constraint promo_codes_dates_check check (starts_at is null or ends_at is null or ends_at > starts_at),
  constraint promo_codes_max_uses_check check (max_uses is null or max_uses > 0)
);

comment on table promo_codes is
  'Codes promo boutique. Le port étant calculé côté app, free_shipping ne peut pas être un coupon Stripe.';

create index if not exists promo_codes_active_idx on promo_codes (active);

drop trigger if exists promo_codes_updated_at on promo_codes;
create trigger promo_codes_updated_at
  before update on promo_codes
  for each row execute function update_updated_at_column();

-- ── Utilisations ────────────────────────────────────────────────────────────

-- Table de faits : sert au plafond d'usages, à la règle « une fois par email »,
-- et à savoir ce qu'un code a réellement coûté.
create table if not exists promo_code_uses (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),

  promo_code_id uuid not null references promo_codes(id) on delete cascade,
  shop_order_id uuid not null,
  email         text not null,
  -- Remise réellement accordée (centimes). 0 sur un code livraison gratuite :
  -- le gain est sur le port, pas sur le sous-total.
  amount        integer not null default 0,

  -- Idempotence : rejouer la création d'une même commande ne consomme pas deux fois.
  unique (promo_code_id, shop_order_id)
);

create index if not exists promo_code_uses_email_idx on promo_code_uses (promo_code_id, lower(email));
create index if not exists promo_code_uses_order_idx on promo_code_uses (shop_order_id);

-- ── Commandes ───────────────────────────────────────────────────────────────

-- Le code appliqué, figé sur la commande : le code peut être supprimé ou modifié
-- ensuite, la facture doit rester lisible.
alter table shop_orders
  add column if not exists promo_code text;

comment on column shop_orders.promo_code is
  'Code promo appliqué, instantané textuel. `discount_amount` porte la remise (partagée avec la promo newsletter).';

-- ── Consommation atomique ───────────────────────────────────────────────────

-- `for update` verrouille la ligne : sans ça, deux clients qui paient en même
-- temps avec le dernier usage disponible passeraient tous les deux. Les règles
-- sont revalidées ICI et pas seulement dans l'app — c'est le seul endroit où la
-- vérification et l'incrément sont indissociables.
create or replace function redeem_promo_code(
  p_code     text,
  p_email    text,
  p_order_id uuid,
  p_amount   integer default 0
)
returns table (ok boolean, reason text)
language plpgsql
as $$
declare
  v promo_codes%rowtype;
begin
  select * into v from promo_codes where code = upper(trim(p_code)) for update;

  if not found                                             then return query select false, 'introuvable';     return; end if;
  if not v.active                                          then return query select false, 'inactif';         return; end if;
  if v.starts_at is not null and now() < v.starts_at       then return query select false, 'pas_encore';      return; end if;
  if v.ends_at   is not null and now() > v.ends_at         then return query select false, 'expire';          return; end if;
  if v.max_uses  is not null and v.uses >= v.max_uses      then return query select false, 'epuise';          return; end if;

  if v.once_per_email and exists (
    select 1 from promo_code_uses u
    where u.promo_code_id = v.id and lower(u.email) = lower(trim(p_email))
  ) then
    return query select false, 'deja_utilise'; return;
  end if;

  insert into promo_code_uses (promo_code_id, shop_order_id, email, amount)
  values (v.id, p_order_id, lower(trim(p_email)), p_amount)
  on conflict (promo_code_id, shop_order_id) do nothing;

  -- Conflit = cette commande avait déjà consommé le code : succès, sans second
  -- incrément (le webhook Stripe peut rejouer).
  if not found then return query select true, 'deja_compte'; return; end if;

  update promo_codes set uses = uses + 1 where id = v.id;
  return query select true, 'ok';
end;
$$;

comment on function redeem_promo_code is
  'Valide et consomme un code pour une commande. Retourne (ok, reason). Idempotent par commande.';

-- Session Stripe expirée : la commande fantôme est supprimée, l'usage doit être
-- rendu — sinon un panier abandonné brûlerait un code à usage unique.
create or replace function release_promo_code(p_order_id uuid)
returns integer
language plpgsql
as $$
declare
  v_id      uuid;
  v_released integer := 0;
begin
  for v_id in
    delete from promo_code_uses where shop_order_id = p_order_id returning promo_code_id
  loop
    update promo_codes set uses = greatest(uses - 1, 0) where id = v_id;
    v_released := v_released + 1;
  end loop;
  return v_released;
end;
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────

-- Aucune policy : un code promo ne se lit pas depuis le navigateur (sinon il
-- suffirait d'interroger la table pour connaître tous les codes en cours). Les
-- accès passent par la service_role côté serveur — validation par /api/boutique/promo.
alter table promo_codes     enable row level security;
alter table promo_code_uses enable row level security;
