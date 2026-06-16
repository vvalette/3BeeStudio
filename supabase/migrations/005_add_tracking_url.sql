-- URL de suivi du transporteur (envoyée par Boxtal : packageTrackingUrl)
-- Permet d'afficher au client un lien direct vers le suivi colis.

alter table orders
  add column if not exists tracking_url text;
