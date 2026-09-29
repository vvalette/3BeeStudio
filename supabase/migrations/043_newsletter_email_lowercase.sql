-- Emails newsletter en minuscules.
--
-- L'inscription gardait la casse saisie : `Jean@exemple.fr` et
-- `jean@exemple.fr` faisaient deux abonnés, donc deux fois −10 %, et un abonné
-- qui tapait son email autrement au checkout perdait sa remise. L'app normalise
-- désormais à l'entrée ; cette migration aligne les lignes existantes.
--
-- Doublons de casse : on garde une seule ligne, celle dont la promo a déjà été
-- utilisée si l'une l'a été (sinon la remise redeviendrait disponible), puis la
-- plus ancienne (l'id départage deux inscriptions à la même seconde).

delete from newsletter_subscriptions n
using newsletter_subscriptions keep
where lower(n.email) = lower(keep.email)
  and n.id <> keep.id
  and (keep.promo_used, n.created_at, n.id) > (n.promo_used, keep.created_at, keep.id);

update newsletter_subscriptions
set email = lower(email)
where email <> lower(email);
