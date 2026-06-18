-- Ajoute le mode de livraison sur les commandes boutique
-- 'delivery' = livraison à domicile (défaut)
-- 'pickup'   = retrait en studio (gratuit, sans adresse)
alter table shop_orders
  add column if not exists delivery_mode text not null default 'delivery';
