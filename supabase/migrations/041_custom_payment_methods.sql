-- Encaissements hors Stripe sur le sur-mesure.
--
-- Tout ne passe pas par un lien de paiement : un acompte arrive souvent par
-- virement, parfois en espèces sur un marché. Ces demandes-là n'ont jamais de
-- webhook pour poser `deposit_paid_at` / `balance_paid_at` : l'admin déclare
-- l'encaissement à la main, et on garde par quel moyen il est arrivé (utile à
-- la déclaration et pour retrouver un virement en cas de litige).
--
-- `null` = ancienne demande antérieure à cette colonne, encaissée par Stripe.

alter table custom_orders add column if not exists deposit_method text;
alter table custom_orders add column if not exists balance_method text;

alter table custom_orders drop constraint if exists custom_orders_deposit_method_check;
alter table custom_orders add constraint custom_orders_deposit_method_check
  check (deposit_method is null or deposit_method in ('stripe', 'transfer', 'cash', 'check'));

alter table custom_orders drop constraint if exists custom_orders_balance_method_check;
alter table custom_orders add constraint custom_orders_balance_method_check
  check (balance_method is null or balance_method in ('stripe', 'transfer', 'cash', 'check'));

comment on column custom_orders.deposit_method is 'Moyen d''encaissement de l''acompte : stripe, transfer, cash, check';
comment on column custom_orders.balance_method is 'Moyen d''encaissement du solde : stripe, transfer, cash, check';
