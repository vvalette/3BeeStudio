-- Coloris disponibles par produit (boutique)
--
-- Les objets sont imprimés à la demande : la même pièce sort en blanc, noir,
-- rose ou beige selon la bobine chargée. Un produit par couleur aurait
-- fragmenté le stock, les statistiques d'audience et le référencement pour un
-- objet strictement identique — on garde une fiche et on demande le coloris au
-- moment de l'achat.
--
-- Le choix est figé sur la ligne de commande (`shop_orders.items[].color`) :
-- la palette d'un produit peut changer après coup, la commande doit rester
-- lisible telle qu'elle a été passée.
--
-- Structure d'une entrée :
--   { "key": "blanc", "label": "Blanc", "label_en": "White", "hex": "#F2F1EC" }
--
--   key      → identifiant stable, envoyé par le panier et revalidé au checkout
--   label    → libellé FR affiché (fiche produit, panier, emails, facture)
--   label_en → libellé EN, optionnel (retombe sur `label` s'il manque)
--   hex      → pastille de couleur affichée dans le sélecteur
--
-- jsonb et pas une table dédiée : la palette n'a ni stock ni prix propre, elle
-- ne sert qu'à l'affichage et au snapshot de commande. Le format laisse aussi
-- la place à une photo par coloris plus tard (une clé `image` à ajouter dans
-- l'objet) sans nouvelle migration.
--
-- Un produit numérique n'a pas de coloris : le formulaire admin masque la
-- section et force `[]` sur ce type.

alter table shop_products
  add column if not exists colors jsonb not null default '[]'::jsonb;

comment on column shop_products.colors is
  'Coloris proposés au client : [{key,label,label_en,hex}]. Vide = pas de choix de couleur.';

-- ── Palette des produits déjà en boutique ───────────────────────────────────
-- Renseignée ici plutôt qu'à la main dans l'admin : ces trois fiches sont déjà
-- en vente, elles doivent proposer le choix dès la mise en ligne du sélecteur.

-- Support pour chargeur de brosse à dents Oral-B avec range-câble
update shop_products
   set colors = '[
         {"key": "blanc", "label": "Blanc", "label_en": "White", "hex": "#F2F1EC"},
         {"key": "noir",  "label": "Noir",  "label_en": "Black", "hex": "#1A1A1C"},
         {"key": "rose",  "label": "Rose",  "label_en": "Pink",  "hex": "#EFA3BD"},
         {"key": "beige", "label": "Beige", "label_en": "Beige", "hex": "#E3D0AF"}
       ]'::jsonb
 where slug = 'support-brosse-a-dent-oral-b';

-- Support universel pour couvercles suspendu (BeeLid Max)
update shop_products
   set colors = '[
         {"key": "noir",  "label": "Noir",  "label_en": "Black", "hex": "#1A1A1C"},
         {"key": "blanc", "label": "Blanc", "label_en": "White", "hex": "#F2F1EC"}
       ]'::jsonb
 where slug = 'support-universel-pour-couvercles-suspendu';

-- Range-couvercles 10 emplacements (BeeLidRack) — la version à poser
update shop_products
   set colors = '[
         {"key": "noir",  "label": "Noir",  "label_en": "Black", "hex": "#1A1A1C"},
         {"key": "blanc", "label": "Blanc", "label_en": "White", "hex": "#F2F1EC"}
       ]'::jsonb
 where slug = 'range-couvercles-10-emplacements-pour-boites-alimentaires';
