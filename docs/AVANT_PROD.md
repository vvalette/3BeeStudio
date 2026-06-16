# 🚀 Avant la mise en production — 3BeeStudio

> Document de référence pour le passage en prod. Mis à jour le 2026-06-16.
> Checklist des actions **manuelles** à faire avant le déploiement (env, Stripe, Supabase, SEO).

---

## 📋 Actions manuelles à faire avant la prod

### 1. Variables d'environnement (Vercel → Settings → Environment Variables → Production)

**Stripe (passage en Live)**

- [ ] `STRIPE_SECRET_KEY` → clé `sk_live_...`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → `pk_live_...`
- [ ] `STRIPE_WEBHOOK_SECRET` → nouveau `whsec_...` de l'endpoint de prod (différent du test)

**Supabase (projet prod)**

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

**Resend**

- [ ] `RESEND_API_KEY`
- [ ] `RESEND_FROM_EMAIL` → `commandes@3beestudio.fr` (domaine déjà vérifié)

**Divers**

- [ ] `NEXT_PUBLIC_APP_URL` → `https://3beestudio.fr` (⚠️ tout le SEO — canonical, hreflang, sitemap, robots — en dépend)
- [ ] `ADMIN_PASSWORD` → mot de passe fort, différent du dev
- [ ] Bloc `BOXTAL_*` → ⚠️ test end-to-end Boxtal pas encore réalisé (voir mémoire projet)

> ℹ️ **Note Resend — audience newsletter** : il n'existe **qu'une seule audience générique** côté Resend (pas d'audience par environnement). `RESEND_AUDIENCE_ID` est **optionnel** : si non défini, l'inscription newsletter fonctionne sans ajout à une audience. Si tu veux que les inscrits soient ajoutés à l'audience générique, renseigne son ID (Dashboard Resend → Audiences).

### 2. Stripe — config Live

- [ ] Activer le compte en mode Live
- [ ] Créer l'endpoint webhook prod : `https://3beestudio.fr/api/stripe/webhook` (events `checkout.session.completed` + `payment_intent.succeeded`)
- [ ] Copier le `whsec_...` généré dans `STRIPE_WEBHOOK_SECRET`
- [ ] ⚠️ Recréer les produits + prix en mode Live : les `stripe_product_id` / `stripe_price_id` créés en test ne fonctionnent pas en Live. Recréer chaque produit boutique via l'admin une fois en clés Live.

### 3. Supabase — prod

- [ ] Lancer **toutes** les migrations `supabase/migrations/*` dans l'ordre, jusqu'à `013_add_en_fields_to_products.sql` et `014_decrement_shop_stock.sql` (décrément stock — **nouveau, requis**)
- [ ] Buckets Storage à créer : `logos`, `product-images`, `stl-files`
- [ ] Vérifier les RLS : le public (`anon`) ne doit lire `shop_products` que sur `active = true`. Les routes serveur utilisent `service_role` (bypass RLS) — OK.

### 4. SEO / DNS

- [ ] Google Search Console : vérifier le domaine, soumettre `https://3beestudio.fr/sitemap.xml`
- [ ] Vérifier en prod : `https://3beestudio.fr/robots.txt` et `/sitemap.xml` (doit lister `/boutique` + fiches produits)
- [ ] Google Business Profile (cf. `docs/project/08-strategie-seo.md`)

### 5. Tests fonctionnels post-déploiement (sur la vraie prod)

- [ ] Commande **boutique** réelle (carte test Live) → email reçu → statut `confirmed` → stock décrémenté
- [ ] Commande **NFC** complète (upload logo → lien → Stripe → email → page suivi)
- [ ] **Devis sur-mesure** : depuis l'admin, envoyer un devis → lien d'acompte Stripe → email client
- [ ] Login admin + déconnexion + accès refusé sans cookie

---

## 🔁 Rappel process de déploiement

Commit sur `dev` + push → Vercel crée le preview via l'intégration Git.
**Ne pas utiliser la CLI `vercel`.** (cf. mémoire projet)
