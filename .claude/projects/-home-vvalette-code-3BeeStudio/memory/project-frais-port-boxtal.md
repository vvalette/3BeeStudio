---
name: frais-port-boxtal-automatique
description: Idée Phase 2 — calculer les frais de port réels via l'API devis Boxtal au lieu des tarifs fixes actuels
metadata:
  type: project
---

Calculer les frais de port automatiquement via le endpoint devis Boxtal (API v3) au lieu des tarifs hardcodés dans `src/types/order.ts` (`getShipping()`).

**Pourquoi pas maintenant :** nécessite l'adresse complète du destinataire avant le paiement, ce qui complexifie le tunnel de commande. Les tarifs fixes actuels (4,90 € / 6,90 € / offert ≥100) sont suffisants pour le lancement.

**How to apply:** Mentionner quand l'utilisateur parle d'optimiser les frais de port, de commandes internationales, ou de marges sur la livraison.
