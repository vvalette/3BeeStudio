-- Vente de fichiers STL (produits numériques)
--
-- Contexte : les modèles imprimables étaient servis depuis le bucket PUBLIC
-- `stl-files` pour alimenter le viewer 3D des fiches produit, et l'URL figurait
-- en clair dans le HTML — n'importe qui pouvait télécharger le STL sans payer.
-- Vérifié en production : HTTP 200 anonyme sur 769 Ko de STL.
--
-- Le modèle sépare donc deux fichiers par produit numérique :
--   * `stl_url`            → maillage d'APERÇU, bucket public, alimente le viewer 3D.
--                            Reste extractible par nature (le navigateur le charge) :
--                            y mettre une version décimée, jamais le fichier vendu.
--   * `digital_file_path`  → fichier VENDU, bucket privé `stl-downloads`, jamais
--                            exposé. Servi uniquement par URL signée courte après
--                            paiement (/api/boutique/download/[orderId]).
--
-- ⚠️ Le bucket privé doit être créé à la main dans le dashboard Supabase :
--    Storage → New bucket → nom `stl-downloads`, « Public bucket » DÉCOCHÉ.
--    Aucune policy à ajouter : les accès passent par la service_role key côté
--    serveur, qui outrepasse RLS.

-- ── Produits ────────────────────────────────────────────────────────────────

-- 'physical' = objet imprimé et expédié ; 'digital' = fichier téléchargeable.
-- Un même objet vendu dans les deux formats = deux produits distincts (l'action
-- « Dupliquer » de l'admin sert exactement à ça).
alter table shop_products
  add column if not exists product_type text not null default 'physical',
  add column if not exists digital_file_path text,
  add column if not exists digital_file_name text,
  add column if not exists digital_file_size integer;

alter table shop_products
  drop constraint if exists shop_products_product_type_check;
alter table shop_products
  add constraint shop_products_product_type_check
  check (product_type in ('physical', 'digital'));

-- Un produit numérique sans fichier vendable ne doit pas pouvoir être publié :
-- le client paierait pour un téléchargement inexistant.
alter table shop_products
  drop constraint if exists shop_products_digital_needs_file_check;
alter table shop_products
  add constraint shop_products_digital_needs_file_check
  check (
    product_type <> 'digital'
    or not active
    or digital_file_path is not null
  );

comment on column shop_products.product_type is
  'physical = objet expédié | digital = fichier STL téléchargeable';
comment on column shop_products.digital_file_path is
  'Chemin dans le bucket PRIVÉ stl-downloads. Jamais exposé au client : servi par URL signée après paiement.';
comment on column shop_products.stl_url is
  'Maillage d''aperçu PUBLIC pour le viewer 3D. Sur un produit numérique, y mettre une version décimée — ce fichier est extractible du navigateur.';

-- ── Commandes ───────────────────────────────────────────────────────────────

-- Renseigné au checkout : évite de recalculer la nature de la commande en
-- rejouant les produits (qui peuvent avoir changé de type depuis).
alter table shop_orders
  add column if not exists has_digital  boolean not null default false,
  add column if not exists has_physical boolean not null default true;

-- Consentement art. L221-28 3° du Code de la consommation : le droit de
-- rétractation de 14 jours ne tombe QUE si le client a explicitement renoncé
-- avant le téléchargement. On horodate la preuve.
alter table shop_orders
  add column if not exists digital_waiver_at timestamptz;

comment on column shop_orders.digital_waiver_at is
  'Horodatage du renoncement explicite au droit de rétractation (art. L221-28 3°) — obligatoire dès qu''un fichier numérique est vendu';

-- delivery_mode accepte une 4e valeur 'digital' : commande 100 % fichiers, donc
-- ni adresse, ni port, ni expédition Boxtal. Pas de contrainte CHECK sur la
-- colonne (migration 016) → validation applicative (zod), rien à modifier ici.

-- ── Journal des téléchargements ─────────────────────────────────────────────

-- Une ligne par fichier acheté. Porte le quota et l'expiration : un lien de
-- téléchargement ne doit pas devenir un miroir public partageable à vie.
create table if not exists shop_order_downloads (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references shop_orders(id) on delete cascade,
  product_id   uuid not null references shop_products(id) on delete restrict,
  file_path    text not null,
  file_name    text not null,
  -- Snapshot : si le produit est supprimé ou son fichier remplacé, l'acheteur
  -- garde accès à ce qu'il a effectivement payé.
  download_count integer not null default 0,
  max_downloads  integer not null default 10,
  expires_at   timestamptz not null default (now() + interval '30 days'),
  created_at   timestamptz not null default now(),
  last_download_at timestamptz
);

create index if not exists shop_order_downloads_order_idx
  on shop_order_downloads(order_id);

-- Un produit acheté une fois par commande = une seule ligne de droit d'accès.
create unique index if not exists shop_order_downloads_order_product_idx
  on shop_order_downloads(order_id, product_id);

comment on table shop_order_downloads is
  'Droits de téléchargement ouverts après paiement : quota + expiration par fichier acheté';

-- Pas de policy RLS : la table n'est lue et écrite que côté serveur via la
-- service_role key. RLS reste activé par défaut sur le projet, ce qui bloque
-- tout accès anon — c'est le comportement voulu.
alter table shop_order_downloads enable row level security;

-- ── Incrément atomique du compteur ──────────────────────────────────────────

-- Empêche de dépasser le quota en cliquant deux fois : le UPDATE ... WHERE
-- tranche côté base plutôt que côté applicatif (même logique que le décrément
-- de stock de la migration 028).
create or replace function claim_download(p_download_id uuid)
returns table (ok boolean, file_path text, file_name text, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row shop_order_downloads;
begin
  update shop_order_downloads
     set download_count   = download_count + 1,
         last_download_at = now()
   where id = p_download_id
     and download_count < max_downloads
     and expires_at > now()
  returning * into v_row;

  if v_row.id is null then
    return query select false, null::text, null::text, 0;
  else
    return query select true, v_row.file_path, v_row.file_name,
                        (v_row.max_downloads - v_row.download_count);
  end if;
end;
$$;

comment on function claim_download(uuid) is
  'Consomme un téléchargement (quota + expiration vérifiés atomiquement). ok=false si épuisé ou expiré.';
