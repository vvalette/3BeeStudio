-- Pays du client, affiché à côté du rôle/source sur la carte témoignage.
-- Défaut 'France' : la quasi-totalité des avis actuels et à venir.
alter table testimonials
  add column if not exists country text not null default 'France';
