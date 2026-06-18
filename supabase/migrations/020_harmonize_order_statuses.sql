-- Harmonisation des statuts NFC sur ceux de la boutique :
-- suppression de 'printing' et 'printed' → regroupés sous 'processing'.
update orders set status = 'processing'
  where status in ('printing', 'printed');
