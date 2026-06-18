-- Prix promotionnel par produit (null = pas de promo)
ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS sale_price int;

-- Paramètres globaux de la boutique
CREATE TABLE IF NOT EXISTS shop_settings (
  key   text PRIMARY KEY,
  value text NOT NULL
);

INSERT INTO shop_settings (key, value) VALUES ('free_shipping', 'false')
ON CONFLICT (key) DO NOTHING;

-- RLS : lecture publique, écriture réservée au service_role
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique shop_settings"
  ON shop_settings FOR SELECT USING (true);
