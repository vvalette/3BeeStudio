# 🛠️ Plan d'amélioration — 3BeeStudio
> Audit complet du 2026-07-02 (sécurité, robustesse paiement, performance, cohérence, qualité).
> Destiné à être exécuté item par item. Chaque item = problème constaté → fix proposé → critère d'acceptation.
> **Lire `CLAUDE.md` d'abord** (règles absolues : i18n, Supabase Storage, migrations jamais jouées par l'IA, cursor-pointer, navbar 72px…).

## Verdict global
Le code est de bonne qualité : webhooks Stripe/Boxtal signés et idempotents, RLS activée partout (deny-all + policies publiques ciblées), anti-SSRF sur `verify-link`, login admin constant-time + rate-limité, SEO propre (sitemap hreflang, robots, ISR + revalidation ciblée). Les points ci-dessous sont des trous restants, classés par priorité.

---

## P0 — Sécurité / abus (rapide, à faire en premier)

### P0.1 — Rate-limiter les endpoints newsletter (abus d'envoi d'emails)
- **Fichiers** : `src/app/api/newsletter/subscribe/route.ts`, `src/app/api/newsletter/check/route.ts`
- **Problème** : aucun rate limit. `subscribe` déclenche un email Resend (`sendNewsletterWelcome`) vers **n'importe quelle adresse** → vecteur d'email-bombing, coût Resend, réputation du domaine. `check` permet d'énumérer les abonnés (retourne `hasDiscount` pour tout email).
- **Fix** : utiliser `rateLimit` + `getClientIp` de `src/lib/rate-limit.ts` (même pattern que `admin/login`). Suggestion : `subscribe` 5/h/IP, `check` 20/10min/IP.
- **Acceptation** : 429 + `Retry-After` au-delà du seuil ; le flux checkout (qui appelle `check`) fonctionne toujours normalement.

### P0.2 — Headers de sécurité HTTP
- **Fichier** : `next.config.ts` (fonction `headers()`)
- **Problème** : aucun header de sécurité (pas de HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).
- **Fix** : ajouter sur `/(.*)` : `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (ou CSP `frame-ancestors 'none'`), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. Une CSP complète est optionnelle (Stripe redirect = pas de JS Stripe embarqué, mais TikTok embed en iframe sur la landing → si CSP, prévoir `frame-src https://www.tiktok.com`).
- **Acceptation** : headers visibles sur toutes les réponses en preview ; TikTok embed et viewer 3D toujours fonctionnels.

### P0.3 — Webhook Stripe boutique : renvoyer 500 en cas d'échec DB (retry Stripe)
- **Fichier** : `src/app/api/stripe/webhook/route.ts` (bloc `shop_order`, ~l.47)
- **Problème** : si l'update `shop_orders` échoue (`error`), on log puis on renvoie quand même `{ received: true }` (200) → Stripe ne retente jamais → commande payée qui reste `pending_payment`, pas d'email, pas de décrément de stock. Le flux NFC, lui, renvoie bien 500 dans ce cas.
- **Fix** : aligner sur le flux NFC : `return NextResponse.json({ error: 'DB update failed' }, { status: 500 })` quand `error` est non-null. (Ne pas renvoyer 500 si `updatedShop` est simplement null = déjà traité — c'est le cas idempotent normal.)
- **Acceptation** : échec d'update → 500 → Stripe retente ; double livraison du webhook → toujours un seul décrément de stock (garde `.eq('status','pending_payment')` conservée).

---

## P1 — Robustesse du flux paiement

### P1.1 — Gérer `checkout.session.expired` : libérer la promo newsletter + nettoyer les commandes fantômes
- **Fichiers** : `src/app/api/stripe/webhook/route.ts`, `src/app/api/boutique/checkout/route.ts`
- **Problème 1** : la promo newsletter est consommée (`promo_used = true`) **à la création de la session**, avant paiement. Panier abandonné = promo brûlée définitivement pour le client.
- **Problème 2** : chaque tentative de checkout crée une ligne `orders`/`shop_orders` en `pending_payment` qui n'est jamais nettoyée → les tables se remplissent de commandes fantômes (et faussent potentiellement les stats admin).
- **Fix** :
  1. Écouter `checkout.session.expired` dans le webhook. Sur expiration : passer la commande (`orders` ou `shop_orders` selon metadata) en statut `expired` (ou la supprimer), et si `metadata.newsletter_promo_email` est présent, remettre `promo_used = false` pour cet email.
  2. Dans `checkout/route.ts` : ajouter `expires_at` à la session Stripe (ex. 30 min, min Stripe = 30 min) et stocker l'email promo dans `metadata` pour le rollback.
  3. ⚠️ **Ajouter l'event `checkout.session.expired` à l'endpoint webhook Stripe** (action manuelle dashboard — le documenter dans `docs/AVANT_PROD.md`).
  4. Si nouveau statut `expired` : créer le fichier de migration SQL (**ne pas l'exécuter** — règle projet : l'utilisateur applique les migrations lui-même) et mettre à jour les types `src/types/order.ts` / `shop-order.ts` + éventuels filtres admin.
- **Acceptation** : session abandonnée → après expiration, la promo est réutilisable et la commande n'apparaît plus en `pending_payment`.

### P1.2 — Fallback `payment_intent.succeeded` : couvrir aussi la boutique
- **Fichier** : `src/app/api/stripe/webhook/route.ts` (~l.129)
- **Problème** : le fallback `payment_intent.succeeded` (paiements asynchrones, webhook `session.completed` manqué) ne traite que la table `orders` (NFC). Une commande boutique payée par virement/paiement différé ne serait jamais confirmée par ce chemin.
- **Fix** : dans la branche lookup-par-session, lire aussi `session.metadata.shop_order_id` et dérouler la même logique que `session.completed` (update + décrément stock + revalidate + email). Factoriser la confirmation boutique dans une fonction partagée (ex. `confirmShopOrder(session)`), utilisée par les deux branches, pour ne pas dupliquer la logique d'idempotence.
- **Acceptation** : rejouer un `payment_intent.succeeded` sans `session.completed` préalable confirme la commande boutique une seule fois.

### P1.3 — Masquer les PII sur l'API publique de suivi
- **Fichier** : `src/app/api/boutique/order/[orderId]/route.ts`
- **Problème** : quiconque possède l'UUID (lien de suivi partagé, historique navigateur, referer) obtient email complet, nom, ville, code postal. L'UUID protège par non-devinabilité mais l'API renvoie plus que nécessaire.
- **Fix** : masquer l'email (`v•••@gmail.com`) et retirer `shipping_postal_code` de la réponse si non affiché ; vérifier ce que la page `boutique/suivi/[orderId]` consomme réellement et ne renvoyer que ça. Vérifier de la même façon ce que les pages `suivi/[orderId]` et `custom/[orderId]` (server components) affichent.
- **Acceptation** : la page de suivi affiche la même chose qu'avant ; la réponse API ne contient plus d'email complet.

### P1.4 — Durcir l'upload de logo SVG (endpoint public)
- **Fichier** : `src/app/api/upload/logo/route.ts`
- **Problème** : la sanitisation regex (`<script`, `on\w+=`, `javascript:`, `foreignObject`) est contournable (entités XML, `xlink:href`, `<use>`, animations SMIL, CSS `url()`). Risque limité (fichiers servis depuis l'origine Supabase, pas 3beestudio.fr) mais l'endpoint est public. Par ailleurs les fichiers uploadés sans commande finalisée ne sont jamais nettoyés (stockage orphelin illimité).
- **Fix** :
  1. Remplacer les regex par une vraie sanitisation : parser XML + allowlist de balises/attributs (lib `dompurify` + `jsdom` côté serveur, profil SVG), ou a minima rejeter tout SVG contenant `<use`, `xlink:href`, `href=`, `<animate`, `<set`, `<style` en plus des patterns actuels.
  2. Servir avec `Content-Disposition: attachment` n'est pas possible via `getPublicUrl` simple — alternative : conserver l'origine Supabase (isolation d'origine = mitigation acceptable) et le documenter en commentaire.
  3. Nettoyage des orphelins : petit script ou route cron (Vercel Cron) qui supprime du bucket `logos` les fichiers > 30 jours non référencés par une ligne `orders.logo_url`.
- **Acceptation** : un SVG avec payload `<use xlink:href>` ou SMIL est rejeté ; les logos légitimes (exports Figma/Illustrator) passent toujours.

### P1.5 — Session admin : token avec expiration
- **Fichiers** : `src/lib/auth.ts`, `src/app/api/admin/login/route.ts`
- **Problème** : le cookie contient un HMAC **statique** (`HMAC(password, 'admin-session-v1')`). Un token volé est valable à vie tant que `ADMIN_PASSWORD` ne change pas ; aucune révocation possible.
- **Fix** : token structuré `exp.signature` où `signature = HMAC(password, 'admin-session-v1.' + exp)` ; `isAuthenticated` vérifie signature **et** `exp > now`. Garder maxAge cookie 7 j aligné sur `exp`. (Pas besoin de JWT/lib externe — rester sur `crypto` natif, mono-admin.)
- **Acceptation** : cookie forgé/expiré → 401 ; login → session 7 jours ; changement de `ADMIN_PASSWORD` invalide toutes les sessions (comportement actuel conservé).

---

## P2 — Performance (audience mobile TikTok/Instagram — prioritaire pour le business)

### P2.1 — Viewers 3D dans les cartes catalogue : un contexte WebGL par carte
- **Fichiers** : `src/components/boutique/BoutiqueProductCard.tsx` (l.120-127), `src/components/boutique/STLViewer.tsx`
- **Problème** : chaque carte produit avec STL monte un `<Canvas>` three.js **en permanence** (visibilité gérée à l'opacité). N produits = N contextes WebGL (les navigateurs en tuent au-delà de ~8-16) + N téléchargements de STL + boucle de rendu continue → catalogue lourd sur mobile.
- **Fix** (dans l'ordre d'impact) :
  1. Ne monter le `STLViewerWrapper` que lorsque le slide 3D est actif (`active.type === '3d'`), démonter sinon — le fondu peut se faire sur une capture/poster ou accepter un cut.
  2. `<Canvas frameloop="demand" dpr={[1, 1.5]}>` dans `STLViewer.tsx` (invalidation manuelle sur interaction OrbitControls) — le modèle est statique, pas besoin de 60 fps continus.
  3. Pauser via `IntersectionObserver` quand la carte sort du viewport (idem pour `NFCKeychain3DCanvas` sur la landing, qui anime en continu avec `useFrame`).
- **Acceptation** : catalogue avec 10+ produits STL fluide sur mobile ; pas de warning "too many WebGL contexts" ; le viewer plein sur la fiche produit garde son comportement actuel.

### P2.2 — Images produits : `<img>` bruts sans lazy-loading ni dimensions
- **Fichiers** : `BoutiqueProductCard.tsx`, `BoutiqueProductMedia.tsx`, `CartDrawer.tsx`, `CheckoutClient.tsx`, composants admin
- **Problème** : `<img>` natifs sans `loading="lazy"`, sans `width/height` (CLS), sans redimensionnement — les images Supabase sont servies à taille originale.
- **Fix** :
  1. Public (boutique) : passer à `next/image` avec `fill` + `sizes` adaptés. **Ajouter le hostname Supabase** (`<project>.supabase.co`) aux `remotePatterns` de `next.config.ts`. Alternative sans next/image : Supabase Image Transformations (`/render/image/public/...?width=600`) + `loading="lazy"` + `decoding="async"`.
  2. Admin : `loading="lazy"` suffit (pas de trafic public).
- **Acceptation** : Lighthouse mobile sur `/boutique` — CLS ≈ 0, images servies redimensionnées ; pas de régression visuelle sur le carousel de cartes.

### P2.3 — Nettoyer `remotePatterns` (incohérence config)
- **Fichier** : `next.config.ts`
- **Problème** : `*.public.blob.vercel-storage.com` (Vercel Blob **non utilisé** — règle CLAUDE.md) et `images.unsplash.com` (aucun usage dans `src/`) traînent dans la config. Le host Supabase, lui, manque.
- **Fix** : supprimer blob + unsplash, ajouter Supabase (cf. P2.2). Garder les patterns TikTok CDN (utilisés par les thumbnails oembed).
- **Acceptation** : build OK, images landing (TikTok) et boutique OK.

### P2.4 — Messages i18n : bundle complet envoyé au client
- **Fichier** : `src/app/[locale]/layout.tsx` (l.84-94)
- **Problème** : `getMessages()` transmet les ~1000 lignes de `fr.json`/`en.json` à `NextIntlClientProvider` sur **toutes** les pages, y compris celles qui n'utilisent quasi rien côté client.
- **Fix** : ne passer au provider global que les namespaces réellement consommés par des composants client partagés (navbar, cart, footer…) — via un pick explicite des namespaces. Les pages lourdes en client (NFC form, checkout) peuvent imbriquer un provider local avec leurs namespaces. Vérifier avec le README next-intl la méthode recommandée (`messages` partiel est supporté).
- **Acceptation** : payload RSC/HTML réduit (visible dans l'onglet réseau), aucune erreur `MISSING_MESSAGE` sur l'ensemble des pages FR + EN.

### P2.5 — Compresser la vidéo démo NFC (10 Mo)
- **Fichier** : `public/video/video_demo_nfc_tag.mp4` (10,4 Mo — chargée au clic dans `VideoModal`, pas eagerly : OK)
- **Fix** : réencoder en H.264/H.265 720p CRF ~26-28 (cible ≤ 3 Mo). C'est un fichier à régénérer par l'utilisateur ou via ffmpeg si dispo.
- **Acceptation** : la modal démarre en < 2 s sur 4G.

### P2.6 — Alléger la requête catalogue
- **Fichiers** : `src/app/[locale]/boutique/page.tsx`, `src/app/[locale]/page.tsx`
- **Problème** : `select('*')` sur `shop_products` pour le listing → descriptions markdown complètes FR+EN, `custom_fields`, etc. transférés et sérialisés dans le HTML pour chaque carte.
- **Fix** : sélectionner uniquement les colonnes utilisées par `BoutiqueProductCard`/`BoutiqueCatalog` (id, slug, name, name_en, subtitle, subtitle_en, price, sale_price, stock, images, stl_url, model_rotation, category…). Adapter le type (un `ShopProductCard` restreint ou `Pick<ShopProduct, …>`).
- **Acceptation** : type-check OK, catalogue identique, HTML de `/boutique` plus léger.

---

## P3 — Qualité, outillage, cohérence

### P3.1 — ESLint cassé : lint jamais exécuté
- **Problème** : `npm run lint` (`next lint`, déprécié) tombe sur le prompt interactif de config → **aucun lint ne tourne** sur ce projet.
- **Fix** : migrer vers ESLint CLI flat config (`npx @next/codemod@canary next-lint-to-eslint-cli .` ou config manuelle `eslint.config.mjs` avec `eslint-config-next`), corriger les findings, mettre à jour le script `lint`.
- **Acceptation** : `npm run lint` passe en non-interactif et sort 0 erreur.

### P3.2 — CI GitHub Actions minimale
- **Problème** : aucune CI — un commit qui casse le type-check ou le build part en preview sans garde-fou.
- **Fix** : `.github/workflows/ci.yml` sur push/PR : `npm ci` → `npm run type-check` → `npm run lint` → `npm run build` (avec des env factices pour les vars `NEXT_PUBLIC_*` requises au build ; les routes API ne s'exécutent pas au build). Pas de déploiement dans la CI (Vercel Git integration s'en charge — règle projet).
- **Acceptation** : workflow vert sur `dev`.

### P3.3 — Premiers tests unitaires (logique pure, sans réseau)
- **Fix** : installer `vitest`, tester en priorité : `calcShopShipping` (`src/types/shop-product.ts`), la logique de fusion des quantités du checkout, `isPrivateIp`/`assertSafeUrl` (verify-link), `rateLimit`, le calcul de la remise newsletter (10 % arrondi). Brancher dans la CI (P3.2).
- **Acceptation** : `npm test` vert, ~15-20 assertions sur ces fonctions.

### P3.4 — Dépendances mortes et mal classées
- **Fichier** : `package.json`
- **Problème** : `framer-motion`, `@stripe/stripe-js`, `@stripe/react-stripe-js` → **0 usage** dans `src/` (le checkout est en redirection hébergée Stripe). `@types/three` est en `dependencies` (devrait être en `devDependencies`).
- **Fix** : `npm rm framer-motion @stripe/stripe-js @stripe/react-stripe-js` ; déplacer `@types/three` en dev. Vérifier ensuite `npm run build`.
- **Acceptation** : build OK, bundle inchangé ou réduit.

### P3.5 — Logs : nettoyer les `console.log` de prod
- **Problème** : 17 `console.log` (webhooks surtout). Utile en debug, bruyant en prod, et les logs webhook contiennent des IDs de commande.
- **Fix** : garder les `console.error`, transformer les `console.log` informatifs des webhooks en une seule ligne structurée (`console.info('[webhook]', JSON.stringify({ event, orderId, outcome }))`) et supprimer ceux du front s'il y en a.
- **Acceptation** : plus de `console.log` hors routes serveur ; logs webhook lisibles dans Vercel.

### P3.6 — Monitoring d'erreurs
- **Problème** : aucun error tracking — une erreur checkout/webhook en prod n'est visible qu'en fouillant les logs Vercel.
- **Fix** (léger, adapté micro-entreprise) : soit Sentry free tier (`@sentry/nextjs`), soit a minima une notification email admin (Resend, déjà en place) dans les `catch` critiques : échec webhook Stripe, échec création session checkout, échec décrément stock. Éviter d'alerter sur le bruit (rate limits, 404).
- **Acceptation** : provoquer une erreur webhook en preview → notification/événement visible.

### P3.7 — Incohérence `themeColor` vs thème forcé clair
- **Fichier** : `src/app/[locale]/layout.tsx` (l.58-66)
- **Problème** : `viewport.themeColor` suit `prefers-color-scheme`, alors que le site force le thème clair par défaut (décision projet : pas de suivi OS). Un utilisateur OS-dark avec site clair a une barre navigateur sombre.
- **Fix** : `themeColor: '#FFFFFF'` statique (le toggle dark côté client peut mettre à jour `<meta name="theme-color">` dynamiquement via `next-themes` si souhaité — optionnel).
- **Acceptation** : barre navigateur claire par défaut sur mobile, quelle que soit la préférence OS.

### P3.8 — Rate limiting distribué (optionnel, si trafic ↑)
- **Fichier** : `src/lib/rate-limit.ts`
- **Problème (connu et documenté dans le code)** : limiteur en mémoire par instance — best-effort en serverless multi-instance.
- **Fix** : ne rien faire tant que le trafic est faible (Fluid Compute réutilise les instances, ça reste efficace). Si abus constaté : `@upstash/ratelimit` + Upstash Redis (marketplace Vercel) en remplaçant l'implémentation interne de `rateLimit` sans changer sa signature.
- **Acceptation** : n/a (décision différée — garder l'item comme trace).

---

## Pièges / règles à respecter pendant l'exécution (rappel CLAUDE.md + mémoire projet)
1. **Migrations SQL : créer le fichier, ne JAMAIS l'exécuter** — l'utilisateur les applique manuellement.
2. **Supabase Storage uniquement** — jamais `@vercel/blob`.
3. **Toute chaîne visible → `messages/fr.json` + `messages/en.json`** (next-intl), jamais de texte en dur.
4. **Déploiement = commit sur `dev` + push** (Vercel Git integration) — jamais la CLI `vercel`.
5. Thème : clair par défaut, couleurs via tokens CSS, jamais de sombre codé en dur.
6. `cursor-pointer` sur tout élément interactif ; dropdowns via `src/components/ui/Select.tsx` ; tooltips maison (jamais `title=""`).
7. Navbar fixe 72 px gérée par le layout — ne pas doubler le padding dans les pages.
8. Avant tout travail Boxtal : lire la spec `boxtal_api-v3.json` (racine).
9. Après chaque item : `npm run type-check` (et `npm run lint` une fois P3.1 fait). Build de vérification : `NEXT_BUILD_DIR=.next-build npm run build` (ne pas casser le `next dev` en cours).

## Ordre d'exécution suggéré
P0.1 → P0.2 → P0.3 (une session) · P1.1 → P1.2 (une session, même fichier webhook) · P1.3 → P1.5 · P2.1 → P2.2 → P2.3 (une session, front boutique) · P2.4 → P2.6 · P3.1 → P3.2 → P3.4 (tooling) · P3.3 → P3.5 → P3.6 · le reste au fil de l'eau.
