-- Devis importé : un PDF fabriqué ailleurs (traitement de texte, outil de
-- devis) que l'admin téléverse pour l'envoyer tel quel au client.
--
-- Le devis composé dans l'app reste reconstruit à la volée depuis quote_items
-- (migration 032) ; ici, au contraire, c'est le fichier téléversé qui fait foi,
-- donc il faut le stocker. Les deux modes cohabitent sur la même demande :
-- quote_pdf_path renseigné = c'est ce PDF qui part en pièce jointe.
--
-- ⚠️ Bucket à créer à la main dans Supabase Storage : `quotes`, PRIVÉ.
--    Un devis porte le nom, les prix et parfois l'adresse du client : il ne
--    doit jamais être joignable par URL publique. Le fichier n'est servi que
--    par /api/admin/custom/[orderId]/quote-pdf, derrière l'auth admin.

alter table custom_orders add column if not exists quote_pdf_path text;
alter table custom_orders add column if not exists quote_pdf_name text;

comment on column custom_orders.quote_pdf_path is 'Chemin dans le bucket PRIVÉ `quotes`. Non nul = devis importé, il remplace le PDF généré';
comment on column custom_orders.quote_pdf_name is 'Nom d''origine du fichier téléversé, réutilisé pour la pièce jointe';
