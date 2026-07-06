-- Le budget et le délai ne sont plus demandés dans le formulaire sur-mesure
alter table custom_orders alter column budget_range drop not null;
alter table custom_orders alter column deadline drop not null;

-- Fichier de référence fourni par le client (photo, STL, etc.)
alter table custom_orders add column if not exists reference_file_url text;
