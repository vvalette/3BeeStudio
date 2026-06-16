-- Ajoute le champ stl_url aux produits boutique
alter table shop_products
  add column if not exists stl_url text;

-- Note : créer les buckets Supabase Storage manuellement dans le dashboard :
--   - product-images  (public)
--   - stl-files       (public)
