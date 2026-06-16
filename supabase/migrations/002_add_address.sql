-- Ajout des colonnes d'adresse de livraison à la table orders

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_name        TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address     TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address2    TEXT,
  ADD COLUMN IF NOT EXISTS shipping_city        TEXT,
  ADD COLUMN IF NOT EXISTS shipping_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS shipping_country     TEXT;
