-- Devis PDF sur-mesure : les données imprimées sur le document, conservées pour
-- qu'un devis régénéré plus tard soit strictement identique à celui envoyé.
--
-- Le PDF lui-même n'est pas stocké : il se reconstruit à l'identique depuis ces
-- colonnes (cf. src/lib/quote/pdf.ts).

alter table custom_orders add column if not exists quote_number    text;
alter table custom_orders add column if not exists quote_object    text;
alter table custom_orders add column if not exists quote_items     jsonb;
alter table custom_orders add column if not exists quote_issued_at timestamptz;

-- Numérotation continue et sans doublon — exigence comptable. L'index partiel
-- laisse cohabiter toutes les demandes sans devis (quote_number null).
create unique index if not exists custom_orders_quote_number_key
  on custom_orders (quote_number)
  where quote_number is not null;

comment on column custom_orders.quote_number is 'Numéro de devis DEV-AAAA-NNN, alloué à l''envoi';
comment on column custom_orders.quote_items is 'Lignes du devis : [{ label, detail, quantity, unit_price }] — unit_price en centimes';
