-- Consultations des fiches produit (audience boutique).
--
-- Pourquoi une table maison alors que @vercel/analytics est déjà monté : le
-- dashboard Vercel donne les vues par URL, mais hors de l'admin, non croisables
-- avec les ventes, et leur lecture par API demande un plan payant. Ici la donnée
-- vit à côté des commandes, donc le taux de conversion par produit se calcule.
--
-- Modèle : AGRÉGAT QUOTIDIEN, pas d'événements bruts. Une ligne par produit et
-- par jour — la table reste minuscule (30 produits × 365 j ≈ 11 k lignes/an) et
-- l'écran admin répond sans agrégation coûteuse.
--
-- ⚠️ La fiche produit est en ISR (revalidate = 3600) : le serveur ne re-rend la
-- page qu'une fois par heure, donc compter côté serveur raterait la quasi-totalité
-- des visites. Le comptage part du navigateur (POST /api/boutique/view).
--
-- RGPD : aucune IP ni identifiant persistant n'est stocké. Le visiteur est réduit
-- à un hash salé qui change chaque jour (voir src/lib/product-stats.ts), gardé
-- 45 jours au plus, et sert uniquement à ne pas compter deux fois le même
-- visiteur dans les « uniques » du jour. Pas de cookie ni de stockage navigateur
-- → mesure d'audience exemptée de consentement (lignes directrices CNIL).

-- ── Agrégat quotidien ───────────────────────────────────────────────────────

create table if not exists shop_product_stats_daily (
  product_id uuid not null references shop_products(id) on delete cascade,
  -- Jour civil en Europe/Paris : à minuit UTC on est déjà demain à Paris l'été,
  -- les vues de la soirée basculeraient sur le mauvais jour.
  day        date not null,

  views      integer not null default 0,  -- chargements de la fiche
  uniques    integer not null default 0,  -- visiteurs distincts dans la journée
  carts      integer not null default 0,  -- ajouts au panier depuis la fiche

  primary key (product_id, day)
);

comment on table shop_product_stats_daily is
  'Audience des fiches produit, agrégée par jour. Alimentée par /api/boutique/view.';
comment on column shop_product_stats_daily.uniques is
  'Visiteurs distincts du jour (hash salé rotatif), toujours ≤ views.';

-- Les écrans admin lisent « les N derniers jours, tous produits » : l'index par
-- jour évite le seq scan quand l'historique s'allonge.
create index if not exists shop_product_stats_daily_day_idx
  on shop_product_stats_daily (day desc);

-- ── Dédoublonnage des visiteurs uniques ─────────────────────────────────────

-- Table de travail, volontairement éphémère : elle ne sert qu'à répondre « ce
-- visiteur a-t-il déjà vu cette fiche aujourd'hui ? ». Purgée à 45 jours.
create table if not exists shop_product_view_hits (
  visitor_hash text not null,
  product_id   uuid not null references shop_products(id) on delete cascade,
  day          date not null,

  primary key (visitor_hash, product_id, day)
);

comment on table shop_product_view_hits is
  'Dédoublonnage des uniques du jour. Hash salé rotatif, aucune donnée personnelle, purge à 45 j.';

create index if not exists shop_product_view_hits_day_idx
  on shop_product_view_hits (day);

-- ── Enregistrement d'un événement ───────────────────────────────────────────

-- Un seul aller-retour SQL par visite, et l'incrément est atomique : deux
-- visites simultanées sur la même fiche ne peuvent pas s'écraser l'une l'autre
-- (upsert `on conflict do update` avec lecture de la valeur courante).
create or replace function record_product_event(
  p_product_id   uuid,
  p_visitor_hash text,
  p_event        text default 'view'
)
returns void
language plpgsql
as $$
declare
  v_day     date := (now() at time zone 'Europe/Paris')::date;
  v_first   boolean := false;
begin
  if p_event = 'cart' then
    insert into shop_product_stats_daily (product_id, day, carts)
    values (p_product_id, v_day, 1)
    on conflict (product_id, day) do update
      set carts = shop_product_stats_daily.carts + 1;
    return;
  end if;

  -- FOUND est faux quand la ligne existait déjà (conflit) : le visiteur a déjà
  -- été compté aujourd'hui sur cette fiche, la vue compte mais pas l'unique.
  insert into shop_product_view_hits (visitor_hash, product_id, day)
  values (p_visitor_hash, p_product_id, v_day)
  on conflict do nothing;
  v_first := found;

  insert into shop_product_stats_daily (product_id, day, views, uniques)
  values (p_product_id, v_day, 1, case when v_first then 1 else 0 end)
  on conflict (product_id, day) do update
    set views   = shop_product_stats_daily.views + 1,
        uniques = shop_product_stats_daily.uniques + excluded.uniques;
end;
$$;

comment on function record_product_event is
  'Incrémente l''agrégat du jour pour une fiche produit. p_event : view | cart.';

-- ── Rétention ───────────────────────────────────────────────────────────────

-- 13 mois sur les statistiques = durée maximale recommandée par la CNIL pour la
-- mesure d'audience, et exactement ce qu'il faut pour comparer à l'an dernier.
-- Les hash partent bien plus tôt : passé la journée ils ne servent plus à rien.
create or replace function purge_product_stats()
returns table (deleted_hits bigint, deleted_stats bigint)
language plpgsql
as $$
declare
  v_hits  bigint;
  v_stats bigint;
begin
  delete from shop_product_view_hits
  where day < (now() at time zone 'Europe/Paris')::date - interval '45 days';
  get diagnostics v_hits = row_count;

  delete from shop_product_stats_daily
  where day < (now() at time zone 'Europe/Paris')::date - interval '13 months';
  get diagnostics v_stats = row_count;

  return query select v_hits, v_stats;
end;
$$;

-- ── Totaux depuis toujours ──────────────────────────────────────────────────

-- Vue plutôt qu'une colonne compteur : PostgREST ne sait pas faire de `group by`,
-- et l'admin veut « depuis la mise en ligne » sans rapatrier 13 mois de lignes.
create or replace view shop_product_stats_totals as
select
  product_id,
  sum(views)::bigint   as views,
  sum(uniques)::bigint as uniques,
  sum(carts)::bigint   as carts,
  min(day)             as first_day,
  max(day)             as last_day
from shop_product_stats_daily
group by product_id;

-- Sans security_invoker la vue s'exécute avec les droits de son propriétaire et
-- contournerait la RLS des tables sous-jacentes : n'importe quel client anon
-- lirait l'audience de la boutique via PostgREST.
alter view shop_product_stats_totals set (security_invoker = on);

-- ── RLS ─────────────────────────────────────────────────────────────────────

-- Aucune policy : personne ne lit ni n'écrit ces tables depuis le client. Les
-- écritures passent par la RPC appelée avec la service_role key (qui outrepasse
-- RLS), la lecture par les pages admin côté serveur.
alter table shop_product_stats_daily enable row level security;
alter table shop_product_view_hits   enable row level security;
