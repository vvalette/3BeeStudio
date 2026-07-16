-- Permet de marquer un témoignage comme "avis Google" recopié à la main
-- (saisie manuelle dans l'admin — pas d'import automatique, l'API Google
-- Places nécessite un compte de facturation).
alter table testimonials
  add column if not exists source text not null default 'manual' check (source in ('manual', 'google')),
  add column if not exists rating int not null default 5 check (rating between 1 and 5),
  add column if not exists avatar_url text,
  add column if not exists source_url text;
