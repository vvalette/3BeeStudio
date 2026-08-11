# 📥 TODO — Produits numériques (vente de fichiers 3D)

> État au 11 août 2026. La fonctionnalité est **livrée et en production**, deux
> fichiers sont en vente sur `/designs` à 1,50 €. Ce qui suit est ce qui reste.

---

## ✅ Fait

- [x] Migration `030_digital_products.sql` appliquée (product_type, digital_file_*, table `shop_order_downloads`, fonction `claim_download`)
- [x] Bucket **privé** `stl-downloads` créé (« Public bucket » décoché)
- [x] Livraison par URL signée (2 min) via `/api/boutique/download/[orderId]`, quota 10 / expiration 30 j tranchés en base
- [x] Panier mixte : port sur la part physique seule (`splitCart`) ; panier 100 % fichiers → `delivery_mode = 'digital'`, sans adresse
- [x] Renoncement au droit de rétractation (art. L221-28 3°) obligatoire au checkout + horodaté
- [x] CGV FR/EN — article 6 bis (livraison, rétractation, licence, absence de garantie d'impression)
- [x] Export CSV — colonne « Catégorie fiscale » (Marchandises / Services)
- [x] Page `/designs` séparée de `/boutique` + entrée navbar « Designs 3D »
- [x] Test de bout en bout validé en clés Stripe **test** (achat → droits → téléchargement → refus des accès non autorisés)
- [x] Deux produits en vente : BeeBrush™ (Oral-B) et BeeHook™ (casque), 1,50 € chacun

---

## ✅ Upload de gros fichiers — corrigé

- [x] `/api/admin/upload/digital-file` ne reçoit plus le fichier : elle délivre
      une **URL d'upload signée** Supabase, et le navigateur envoie le fichier
      directement (XHR, avec barre de progression). La limite de taille de requête
      de la plateforme n'est plus dans le chemin.
      Testé par le formulaire admin avec le vrai STL de 17,3 Mo : 2,4 s, fichier
      déposé dans le bucket **privé** uniquement, inaccessible publiquement.
      Plafond applicatif : 200 Mo.

## 🔴 À faire

*(rien de bloquant pour l'instant)*

## 🟠 À faire — sécurité / administratif

- [ ] **Ticket support GitHub** : demander un garbage collect du dépôt.
      Le STL vendu du support Oral-B a été commité par erreur sur le dépôt
      **public** puis purgé par réécriture d'historique + force push. Le blob
      reste atteignable par son ancien SHA (`3f3d9d7`) jusqu'au GC de GitHub.
      Fenêtre d'exposition constatée : ~15 min.
- [ ] **Changer le mot de passe admin de production** (transmis en clair dans un
      échange de chat le 11/08).
- [ ] `CRON_SECRET` à définir dans les variables d'environnement Vercel — sans
      lui, `/api/cron/low-stock` répond 503 (fail-closed voulu) et le digest
      hebdomadaire des stocks bas ne part pas.

## 🟡 À faire — plus tard (demandé le 11/08)

- [ ] **Séparer numérique et physique dans l'admin**, sur les deux écrans :
      - **Commandes** (`/admin/commandes`) : aujourd'hui l'onglet « Boutique »
        mélange les deux. Une commande de fichiers n'a ni étiquette à générer,
        ni adresse, ni suivi — elle n'a rien à faire dans la même liste que les
        colis. Piste : un 4ᵉ onglet « Fichiers » à côté de Boutique /
        Sur-mesure / NFC, alimenté par `shop_orders.has_digital`.
      - **Produits** (`/admin/boutique`) : séparer le catalogue physique du
        catalogue numérique, comme `/boutique` et `/designs` le sont côté
        public. Les colonnes utiles diffèrent (stock/poids d'un côté, fichier
        vendu et compteurs de téléchargement de l'autre).
      À prévoir aussi : afficher les téléchargements consommés sur la fiche de
      commande admin, et pouvoir réouvrir un accès (remettre le quota à zéro)
      quand un client se plaint.

## 🔵 Améliorations produit

- [ ] **Aperçu visuel des fichiers vendus.** Aucun des deux produits n'a
      d'aperçu 3D, volontairement : le viewer fait télécharger le maillage au
      navigateur, donc il est extractible. Une décimation à 30 000 triangles
      (8 % de l'original) a été testée sur le support Oral-B → trop abîmée pour
      être montrée (surface cannelée détruite, trous). Un maillage assez propre
      pour être beau reste assez propre pour être imprimé.
      → La bonne réponse est une **vidéo turntable rendue** (ou un GIF), pas un
      maillage. À produire par produit numérique.
- [ ] **Décider du sort du viewer 3D sur les fiches physiques.** Le `stl_url`
      public du BeeHook est **le fichier vendu**, à l'octet près — arbitré le
      11/08 : on l'accepte, le viewer reste. À revoir si les fichiers prennent
      de l'importance dans le chiffre d'affaires.
- [ ] **Confirmer le classement fiscal avec un comptable.** L'export CSV classe
      les commandes 100 % fichiers en « Services » et le reste en
      « Marchandises ». En micro-entreprise les plafonds, abattements et taux de
      cotisations diffèrent, et les acheteurs hors de France relèvent du régime
      des services électroniques (seuil de 10 000 €, guichet OSS).
- [ ] Un achat test réel en clés **Live** (1,50 €) reste le seul moyen de
      valider la chaîne en production. Elle est validée en clés test.
- [ ] L'upload d'**images** produit passe toujours par le serveur (route
      classique en `FormData`). Sans conséquence aujourd'hui — les photos font
      quelques centaines de Ko — mais la même limite s'appliquerait à une image
      lourde. À basculer sur URL signée si le cas se présente.

---

## 🐞 Points de vigilance

- Le bucket `stl-files` est **public** et alimente le viewer 3D : n'y mettre que
  des maillages d'aperçu, jamais un fichier vendu.
- Le fichier vendu vit dans `stl-downloads` (**privé**) et ne doit jamais
  atteindre le client autrement que par URL signée après paiement.
- `toPublicProduct()` doit rester appelé avant de passer un produit à un
  composant client : le typage seul ne protège pas (TypeScript accepte
  structurellement un `ShopProduct` complet là où un `PublicShopProduct` est
  attendu).
- `TEMP/` est dans `.gitignore` — le dépôt est public, un fichier vendu commité
  y devient téléchargeable par tous.
