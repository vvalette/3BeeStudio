-- RLS sur les paniers abandonnés, oubliée par la 039.
--
-- Sans elle, la clé anon (publique, embarquée dans le site) lisait et écrivait
-- ces tables via PostgREST : emails, noms, contenu des paniers et jetons de
-- restauration de tous les clients. Toutes les autres tables l'ont.
--
-- Aucune policy : personne ne lit ni n'écrit ces tables depuis le client. Le
-- checkout, le webhook, le cron et le lien de désinscription passent tous par la
-- service_role key, qui outrepasse RLS.

alter table abandoned_carts        enable row level security;
alter table abandoned_cart_optouts enable row level security;

-- Les fonctions `security definer` s'exécutent avec les droits de leur
-- propriétaire, donc RLS ne les arrête pas : sans ce revoke, n'importe quel
-- visiteur pouvait les appeler en RPC. Seul le serveur (service_role) s'en sert.
revoke execute on function purge_abandoned_carts()  from public, anon, authenticated;
revoke execute on function claim_download(uuid)     from public, anon, authenticated;
grant  execute on function purge_abandoned_carts()  to service_role;
grant  execute on function claim_download(uuid)     to service_role;
