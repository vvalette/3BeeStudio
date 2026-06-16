-- Filet de sécurité : garantit que la RLS est activée sur orders.
-- Aucune policy = deny-all pour anon/authenticated.
-- Seule la clé service_role (serveur uniquement) bypasse la RLS.
-- La clé anon étant publique (présente dans le navigateur), sans RLS toutes
-- les données clients (emails, téléphones, adresses) seraient lisibles/modifiables.

alter table orders enable row level security;
alter table orders force row level security;
