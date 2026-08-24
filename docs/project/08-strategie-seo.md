# 08 — Stratégie SEO

> Document vivant. Statut au **15 juin 2026**.
> Légende : ✅ Fait · 🟡 À faire (code) · 🖐️ Action manuelle (toi, hors code) · 🔵 Dépend d'une autre phase

## Philosophie & attentes réalistes

Le SEO de 3BeeStudio est un **canal d'appoint qui compose lentement**, pas le moteur d'acquisition principal. Le vrai moteur reste **TikTok / Instagram**. À retenir :

- Les requêtes « money » type *porte-clé nfc personnalisé entreprise* sont **très concurrentielles** → résultats en plusieurs mois, pas en semaines.
- Les gains **réalistes à court terme** sont :
  1. **Recherches de marque** (« 3beestudio », « 3bee studio ») → doivent ramener au site en position 1.
  2. **SEO local** (Beaujolais, Villefranche-sur-Saône, Belleville-en-Beaujolais) → faible concurrence, fort potentiel via Google Business Profile.
  3. **Longue traîne** (« porte-clé nfc carte de visite 3d », « pièce rechange imprimée 3d sur mesure »).
- Le travail technique (Phase 1) ne « fait pas monter » le site tout seul, mais il **garantit qu'aucun canal n'est gaspillé** : pages indexables, partages réseaux avec visuel, pas de contenu dupliqué FR/EN.

---

## Audit initial (avant intervention)

| Élément | État de départ |
|---|---|
| Metadata globale (title/desc/OG/Twitter) | ✅ Présente dans `layout.tsx` |
| Metadata `/nfc`, `/custom` | ✅ Présentes (via i18n) |
| `sitemap.xml` | ❌ Absent |
| `robots.txt` | ❌ Absent |
| `noindex` sur pages privées (`/suivi`, `/custom/[id]`) | ❌ Absent (pages de suivi indexables par erreur) |
| `hreflang` FR/EN | ❌ Absent (risque de duplicate content) |
| Image OG (partage réseaux) | ❌ Aucune image 1200×630 |
| Metadata propre sur la homepage | ❌ Héritait du titre générique |
| Données structurées Schema.org | ❌ Aucune |
| Google Search Console | ❌ Non configuré |
| Google Business Profile | ❌ Non créé |

---

## Phase 0 — Mesure & présence (🖐️ ACTIONS MANUELLES — à faire par toi)

> Ces actions ne sont **pas du code**. Elles sont le prérequis n°0 : sans Search Console, impossible de mesurer ou de soumettre le sitemap.

### 0.1 — ⚠️ Vérifier la variable d'env en production (à faire EN PREMIER)
Le sitemap et les URLs canoniques utilisent `NEXT_PUBLIC_APP_URL`. En local elle vaut `localhost:3001`. **Sur Vercel (Production), elle doit valoir `https://3beestudio.fr`**, sinon Google reçoit un sitemap pointant vers localhost.
1. Vercel → projet 3BeeStudio → **Settings → Environment Variables**
2. Vérifier que `NEXT_PUBLIC_APP_URL = https://3beestudio.fr` existe pour l'environnement **Production** (et **Preview** si souhaité).
3. Si absente/incorrecte → la créer/corriger, puis **redéployer**.

### 0.2 — Google Search Console (GSC)
1. Aller sur [search.google.com/search-console](https://search.google.com/search-console).
2. Ajouter une propriété → choisir **Domaine** (`3beestudio.fr`) plutôt que Préfixe d'URL (couvre tout : http/https/www/sous-domaines).
3. Validation par **enregistrement DNS TXT** : Google fournit une valeur `google-site-verification=...`.
   - Le domaine est géré côté Vercel (DNS). Vercel → **Domains** → `3beestudio.fr` → ajouter un enregistrement **TXT** avec la valeur fournie.
   - Attendre la propagation (quelques minutes à 1h), puis cliquer **Vérifier** dans GSC.
4. Une fois vérifié → menu **Sitemaps** → soumettre `https://3beestudio.fr/sitemap.xml`.
5. (Optionnel) Demander l'indexation manuelle des pages clés via l'**Inspection d'URL**.

### 0.3 — Google Business Profile (fiche établissement)
> Fort levier local. Données légales déjà disponibles (micro-entreprise réelle).
1. Aller sur [business.google.com](https://business.google.com).
2. Créer la fiche : **3BeeStudio**, catégorie *Service d'impression* / *Imprimeur*.
3. Adresse : `144 rue de la République, 69220 Belleville-en-Beaujolais`.
   - Si tu ne reçois pas de clients sur place → cocher **« Je livre mes clients »** (zone de service) et **masquer l'adresse**. La fiche reste valide.
4. Zone de service : Belleville-en-Beaujolais, Villefranche-sur-Saône, Beaujolais, (+ France pour la livraison).
5. Ajouter : site web `https://3beestudio.fr`, téléphone/email, horaires, 5-10 photos de produits, logo.
6. Validation par courrier postal (code) ou autre moyen proposé par Google.

### 0.4 — Annuaires & citations (NAP cohérent)
> NAP = **N**om, **A**dresse, **P**hone, identiques partout (signal de confiance local).
- Societe.com / Pappers (souvent automatique via le SIREN `931 419 550`).
- PagesJaunes, Kompass, Yelp France.
- Mettre le lien `3beestudio.fr` dans **toutes les bios** (TikTok, Instagram).

---

## Phase 1 — Fondations techniques (✅ FAIT — code livré)

Implémenté le 15 juin 2026. Fichiers :

| Fichier | Rôle |
|---|---|
| `src/lib/seo.ts` | Helper `buildAlternates()` (canonical + hreflang) + constante `SITE_URL` |
| `src/app/sitemap.ts` | Sitemap dynamique, **à la racine** (sinon cassé par le middleware i18n), avec alternates FR/EN |
| `src/app/robots.ts` | `robots.txt` : bloque `/admin`, `/api`, `/suivi/`, `/custom/[id]` (FR + EN), expose le sitemap |
| `src/app/[locale]/opengraph-image.tsx` | Image OG 1200×630 générée à la volée (couleurs marque) pour les partages réseaux |
| `src/app/[locale]/page.tsx` | `generateMetadata` ajouté → title/description home + alternates |
| `src/app/[locale]/nfc/page.tsx` | Alternates (hreflang) ajoutés |
| `src/app/[locale]/custom/page.tsx` | Alternates (hreflang) ajoutés |
| `src/app/[locale]/suivi/[orderId]/page.tsx` | `robots: { index: false, follow: false }` (page privée) |
| `src/app/[locale]/custom/[orderId]/page.tsx` | `robots: { index: false, follow: false }` (page privée) |
| `messages/fr.json` · `messages/en.json` | Namespace `homePage.meta` (title + description) |

**Vérifié** : `tsc --noEmit` clean, `next build` OK, `/sitemap.xml` et `/robots.txt` générés avec hreflang FR/EN corrects et pages privées bloquées.

**Reste lié à la Phase 1 (🖐️) :** faire 0.1 (variable d'env prod) puis 0.2 (soumettre le sitemap dans GSC) une fois `dev` mergé/déployé.

---

## Phase 2 — On-page & cohérence (✅ FAIT — code livré)

Implémenté le 15 juin 2026.

| Tâche | Détail | Statut |
|---|---|---|
| Affûter titres/descriptions | `/nfc` → titre « Porte-clé NFC personnalisé entreprise » + desc avec « logo entreprise / 3D / France / dès 5 unités ». `/custom` → « Impression 3D sur-mesure en France » + desc « cadeau / prototype / pièce mécanique / devis 48h » (FR + EN) | ✅ |
| **Cohérence quantité min.** | Source de vérité = `order.ts` + form zod `.min(5)` (palier tarifaire 5–9 = 2,90 €). La vraie valeur est **5**, pas 10. Meta `/nfc` corrigée « dès 10 » → « dès 5 ». La landing « minimum 5 » était déjà correcte. | ✅ |
| **Bug double-marque corrigé** | Les titres `/nfc` et `/custom` contenaient « — 3BeeStudio » alors que le template layout ajoute déjà « · 3BeeStudio.fr » → rendu dupliqué. Suffixe retiré, le template gère la marque. | ✅ |
| H1 du Hero | Vérifié : « Impression 3D, imaginée et imprimée en France » contient déjà les mots-clés (« Impression 3D » + « France »). **Aucun changement nécessaire.** | ✅ |
| Canonical/hreflang pages légales | `buildAlternates` ajouté à `/cgv`, `/mentions-legales`, `/politique-de-confidentialite` | ✅ |
| Harmonisation docs internes « dès 10 » | `04-site-structure.md` et `01-vision.md` corrigés → « dès 5 ». `CLAUDE.md` vérifié : aucune référence quantité (rien à changer). | ✅ |

**Fichiers touchés Phase 2 :** `messages/fr.json`, `messages/en.json` (titres/desc nfc+custom), `cgv/page.tsx`, `mentions-legales/page.tsx`, `politique-de-confidentialite/page.tsx`, `docs/project/04-site-structure.md`, `docs/project/01-vision.md`.

**Vérifié :** `tsc --noEmit` clean · `next build` OK (35/35). Le rendu final des balises `<link canonical/hreflang>` est confirmable post-déploiement (l'inspection HTML runtime n'est pas possible dans l'env de dev sandboxé).

---

## Phase 3 — Données structurées Schema.org + FAQ (✅ FAIT — code livré)

Implémenté le 15 juin 2026. Permet les *rich results* Google.

| Schema | Page | Statut |
|---|---|---|
| `LocalBusiness` | `/` | ✅ 3BeeStudio, 144 rue de la République 69220 Belleville-en-Beaujolais, fondateur, SIRET, areaServed France, priceRange |
| `Product` + `AggregateOffer` | `/nfc` | ✅ lowPrice 1,70 € / highPrice 2,90 €, InStock, vendeur lié au LocalBusiness |
| `FAQPage` + **vraie section FAQ** | `/nfc` | ✅ 6 Q/R B2B réelles (quantité, formats logo, rôle puce, redirection, compatibilité, délais), rendues en `<details>` natif, JSON-LD au texte identique |

**Nouveaux fichiers :** `src/lib/schema.ts` (builders), `src/components/seo/JsonLd.tsx` (injecteur sécurisé, échappe `<`), `src/components/nfc/NfcFaq.tsx` (section FAQ).
**Modifs :** `src/app/[locale]/page.tsx` (LocalBusiness), `src/app/[locale]/nfc/page.tsx` (Product + FAQ), `messages/fr.json` · `messages/en.json` (`nfcPage.faq`).

**Vérifié :** `tsc` clean · `next build` OK (35/35) → les builders schema et la FAQ s'exécutent au rendu serveur sans erreur. Validité *rich results* à confirmer post-déploiement via le [test de résultats enrichis Google](https://search.google.com/test/rich-results).

### Alertes Search Console « Extraits de produits » (24 août 2026)

Google a signalé 3 problèmes **non critiques** sur le `Product` de `/nfc` : `offerCount` manquant, `review` manquant, `aggregateRating` manquant.

| Champ | Décision | Pourquoi |
|---|---|---|
| `offerCount` | ✅ **Ajouté** (`offerCount: 6`) | Un `AggregateOffer` agrège ici les 6 paliers de prix dégressif de `getUnitPrice()`. Donnée factuelle, à tenir à jour si un palier bouge. |
| `review` | ❌ **Volontairement absent** | Un `review` doit porter sur **ce produit** et son texte doit être **visible sur la page**. Les témoignages en base sont des avis sur le studio, repris de Google, et `/nfc` n'en affiche aucun. |
| `aggregateRating` | ❌ **Volontairement absent** | Même raison. Poser une note inventée ou empruntée aux avis du studio, c'est du *spammy structured markup* : risque d'action manuelle, qui coûte bien plus cher qu'un champ facultatif manquant. |

**Ce qu'il faudrait pour les avoir un jour, honnêtement :** des avis clients first-party **par produit**, collectés après livraison, stockés et **affichés sur la fiche** ; le balisage `review` + `aggregateRating` se déduit alors des vraies notes. C'est une fonctionnalité à part entière (formulaire d'avis, modération, affichage), pas un correctif de balise. À noter : l'email « colis arrivé » envoie aujourd'hui vers les avis **Google**, qui ne peuvent pas être rebalisés sur notre propre site.

> 💡 Angle plus rentable que ces trois champs : **les fiches produit boutique (`/boutique/[slug]`) n'ont aucun balisage `Product`**, alors que ce sont les vraies pages produit (prix, stock, images, disponibilité). C'est là que les *rich results* produit auraient le plus d'effet. Non fait à ce jour.

> ⚠️ **Écart prix doc/code découvert** (à arbitrer par toi, hors SEO) : `docs/project/03-produit-nfc.md` affiche un palier « 10–49 → 2,50 € », mais le code (`src/types/order.ts`) applique « 10–24 → 2,60 € » et « 25–49 → 2,40 € ». Les autres paliers concordent. Le code fait foi côté client ; à harmoniser dans la doc (ou ajuster le code) selon ton intention réelle.

---

## Phase 4 — Contenu (🔵 dépend de la Phase 2 produit)

Débloqué quand `/boutique` et `/portfolio` passent en live :
- 🔵 Descriptions produits riches (matériau PLA, dimensions, délai, usage).
- 🔵 `alt` descriptifs sur **toutes** les images portfolio (actuellement placeholder).
- 🔵 (Optionnel) Blog : 1-2 articles longue traîne (« Comment choisir un porte-clé NFC pour son entreprise »). À décider selon l'appétit éditorial.

---

## Récapitulatif — qui fait quoi

| # | Action | Type | Statut |
|---|---|---|---|
| 0.1 | `NEXT_PUBLIC_APP_URL=https://3beestudio.fr` en prod Vercel | 🖐️ Manuel | À faire |
| 0.2 | Google Search Console + soumettre sitemap | 🖐️ Manuel | À faire |
| 0.3 | Google Business Profile | 🖐️ Manuel | À faire |
| 0.4 | Annuaires + liens bios réseaux | 🖐️ Manuel | À faire |
| 1 | Sitemap, robots, noindex, hreflang, OG image, meta home | ✅ Code | **Fait** |
| 2 | Titres affûtés + cohérence quantité (5) + double-marque + canonical légales | ✅ Code | **Fait** |
| 3 | Schema.org (LocalBusiness, Product) + vraie FAQ NFC | ✅ Code | **Fait** |
| 4 | Contenu boutique/portfolio + alt images | 🔵 Code | Bloqué (Phase 2 produit) |

## Prochaine étape recommandée
> Tout le code SEO réalisable maintenant (Phases 1→3) est **fait**. Le reste est manuel ou bloqué.
1. **Toi** : 0.1 (env prod `NEXT_PUBLIC_APP_URL`) — 2 min, sinon le sitemap est inutile.
2. **Déployer** `dev`, puis **toi** : 0.2 (GSC + soumettre sitemap), 0.3 (Google Business), 0.4 (annuaires/bios).
3. **Toi** : valider les schémas via le [test de résultats enrichis Google](https://search.google.com/test/rich-results) sur les URLs `/` et `/nfc` une fois en ligne.
4. **Phase 4** (contenu boutique/portfolio) : débloquée quand ces pages passent en prod.
