-- Décrément de stock : signale les surventes au lieu de les masquer.
--
-- Avant (014) : greatest(stock - qty, 0) clampait silencieusement — si deux clients
-- achetaient la dernière pièce pendant la fenêtre de paiement, personne ne le voyait.
-- Maintenant : retourne { new_stock, oversold } — le webhook Stripe alerte par email
-- quand oversold = true (commande payée pour un stock insuffisant → à gérer à la main).
--
-- Aucune ligne retournée = produit introuvable ou stock non suivi (null).
-- `for update` verrouille la ligne : lecture du stock précédent + écriture atomiques.
--
-- ⚠️ drop obligatoire : on ne peut pas changer le type de retour avec `create or replace`.

drop function if exists decrement_shop_stock(uuid, int);

create function decrement_shop_stock(p_product_id uuid, p_qty int)
returns table (new_stock int, oversold boolean)
language sql
as $$
  with prev as (
    select id, stock
    from shop_products
    where id = p_product_id and stock is not null
    for update
  )
  update shop_products p
  set stock = greatest(prev.stock - p_qty, 0)
  from prev
  where p.id = prev.id
  returning p.stock, prev.stock < p_qty;
$$;
