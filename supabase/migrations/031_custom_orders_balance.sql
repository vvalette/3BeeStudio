-- Solde sur-mesure : second encaissement Stripe après l'acompte, réclamé quand
-- la pièce est prête et avant l'expédition.
--
-- Pas de nouveau statut : la timeline client reste inchangée. L'état du solde se
-- lit sur ces colonnes — demandé (balance_payment_url non nul), réglé
-- (balance_paid_at non nul).

alter table custom_orders add column if not exists balance_amount      integer;      -- centimes
alter table custom_orders add column if not exists balance_payment_url text;
alter table custom_orders add column if not exists balance_session_id  text;
alter table custom_orders add column if not exists balance_paid_at     timestamptz;

comment on column custom_orders.balance_amount is 'Solde réclamé après acompte, en centimes';
comment on column custom_orders.balance_paid_at is 'Date d''encaissement du solde — c''est cette date qui compte pour la déclaration de CA';
