-- Décrément atomique du stock après un achat confirmé (webhook Stripe).
-- N'agit que sur les produits dont le stock est suivi (stock not null).
-- greatest(..., 0) empêche tout stock négatif en cas de course.
create or replace function decrement_shop_stock(p_product_id uuid, p_qty int)
returns void
language sql
as $$
  update shop_products
  set stock = greatest(stock - p_qty, 0)
  where id = p_product_id and stock is not null;
$$;
