-- Ajout de la colonne Boxtal à la table orders

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS boxtal_order_id TEXT;
