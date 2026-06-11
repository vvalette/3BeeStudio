create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  role text not null,
  body text not null,
  avatar_gradient text not null default 'linear-gradient(135deg, #F59E0B, #7C2D12)',
  display_order int not null default 0,
  visible boolean not null default true
);

-- Seed initial data
insert into testimonials (name, role, body, avatar_gradient, display_order) values
  ('Léa M.',         '@lea.designs · TikTok',   'J''ai reçu mon vase Hive en 5 jours. La finition est dingue, le grain mat est exactement ce que j''attendais.',       'linear-gradient(135deg, #F59E0B, #7C2D12)', 1),
  ('Studio Bouchet', 'Architecte d''intérieur', 'On a fait 4 projets avec 3Bee. Réactivité bluffante, qualité au rendez-vous. Notre fournisseur 3D.',                  'linear-gradient(135deg, #6366F1, #1E1B4B)', 2),
  ('Tom V.',         'Joueur d''échecs',         'Le set Studio est juste magnifique. Pièces équilibrées, finition mate parfaite. Un cadeau qui marque.',              'linear-gradient(135deg, #10B981, #064E3B)', 3);

-- RLS : lecture publique, écriture service role uniquement
alter table testimonials enable row level security;

create policy "testimonials_public_read"
  on testimonials for select
  using (visible = true);
