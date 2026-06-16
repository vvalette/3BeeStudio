# Setup — 3BeeStudio

Guide de configuration pour le développement local et la mise en production.

---

## Prérequis

- Node.js 20+
- npm
- [Stripe CLI](https://stripe.com/docs/stripe-cli) (dev uniquement)

---

## Installation

```bash
git clone <repo>
cd 3BeeStudio
npm install
cp .env.local.example .env.local  # puis compléter les valeurs
```

---

## Variables d'environnement

Toutes les clés sont dans `.env.local` (jamais commité). Voir `.env.local.example` pour la structure complète.

| Variable | Dev | Prod |
|----------|-----|------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3001` | `https://3beestudio.fr` |
| `BOXTAL_API_URL` | `https://api.boxtal.build` | `https://api.boxtal.com` |
| `BOXTAL_ACCESS_KEY` | clé sandbox | clé prod |
| `BOXTAL_SECRET_KEY` | secret sandbox | secret prod |
| `STRIPE_SECRET_KEY` | `sk_test_…` | `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` (CLI) | `whsec_…` (Vercel) |

---

## Développement local

### 1. Lancer le serveur

```bash
npm run dev
# → http://localhost:3001
```

### 2. Stripe — écouter les webhooks en local

Stripe ne peut pas atteindre `localhost` directement. La CLI Stripe crée un tunnel.

```bash
# Terminal séparé
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

La CLI affiche :
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxx
```

Copier ce secret dans `.env.local` :
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx
```

> **Note** : Sans webhook CLI actif, la page `/suivi/[orderId]?payment=success` prend le relais (fallback Stripe direct). Le statut sera quand même mis à jour.

Portail Stripe test : https://dashboard.stripe.com/test/payments

### 3. Boxtal — sandbox

Utiliser les clés sandbox dans `.env.local` :

```env
BOXTAL_API_URL=https://api.boxtal.build
BOXTAL_ACCESS_KEY=YR5OPH9MECALUODG2HPNT8YC502ME4JP9V6SNJ2G
BOXTAL_SECRET_KEY=05a617fd-d392-4d67-84b5-d5d366f48753
```

Les commandes créées en sandbox sont visibles sur :
**https://shipping.boxtal.build/fr/fr/centrale-expeditions/mes-commandes**

> Les étiquettes générées en sandbox sont des vraies étiquettes PDF mais non valables pour l'envoi réel.

### 4. Supabase — migrations

Appliquer les migrations en base :

```bash
npm run migrate
```

Ou directement dans le [dashboard Supabase](https://app.supabase.com) → SQL Editor → coller le contenu des fichiers `supabase/migrations/*.sql` dans l'ordre.

Migrations à appliquer dans l'ordre :
```
001_create_orders.sql   ← table principale
002_add_address.sql     ← adresses de livraison
003_add_boxtal.sql      ← boxtal_order_id
```

### 5. Resend — emails en local

En dev, les emails sont envoyés depuis `commandes@3beestudio.fr` (domaine vérifié).

```env
RESEND_FROM_EMAIL=commandes@3beestudio.fr
```

Pour tester sans envoyer de vrais emails : utiliser la route de diagnostic.

```bash
curl http://localhost:3001/api/test-email
```

> ⚠️ Supprimer `/api/test-email` avant le déploiement en production.

### 6. Variables expéditeur Boxtal

Renseigner l'adresse de l'atelier pour les étiquettes :

```env
BOXTAL_SENDER_FIRSTNAME=Valentin
BOXTAL_SENDER_LASTNAME=Valette
BOXTAL_SENDER_EMAIL=commandes@3beestudio.fr
BOXTAL_SENDER_PHONE=+33XXXXXXXXX
BOXTAL_SENDER_COMPANY=3BeeStudio
BOXTAL_SENDER_STREET=X rue des Artisans
BOXTAL_SENDER_CITY=NomVille
BOXTAL_SENDER_POSTAL_CODE=XXXXX
BOXTAL_SENDER_COUNTRY=FR
```

### 7. Admin

URL : `http://localhost:3001/admin`

```env
ADMIN_PASSWORD=ton-mot-de-passe-local
```

---

## Mise en production

### 1. Vercel — variables d'environnement

Dans le [dashboard Vercel](https://vercel.com) → projet 3BeeStudio → Settings → Environment Variables, ajouter toutes les variables de `.env.local` avec les **valeurs de production** :

```env
NEXT_PUBLIC_APP_URL=https://3beestudio.fr
STRIPE_SECRET_KEY=sk_live_…
STRIPE_WEBHOOK_SECRET=whsec_…   ← voir étape 3
BOXTAL_API_URL=https://api.boxtal.com
BOXTAL_ACCESS_KEY=5O0QK893HQ5UFCGUUB0VA0IS39EOW29CBK3MNC5G
BOXTAL_SECRET_KEY=8b580fed-38da-4bd6-a607-3eae7399904c
```

### 2. Stripe — webhook en production

Dans le [dashboard Stripe](https://dashboard.stripe.com/webhooks) → Add endpoint :

- **URL** : `https://3beestudio.fr/api/stripe/webhook`
- **Événements** :
  - `checkout.session.completed`
  - `payment_intent.succeeded`

Copier le **Signing secret** (`whsec_…`) dans les variables Vercel.

### 3. Boxtal — compte de production

Passer les clés sandbox par les clés **de production** :

```env
BOXTAL_API_URL=https://api.boxtal.com
BOXTAL_ACCESS_KEY=5O0QK893HQ5UFCGUUB0VA0IS39EOW29CBK3MNC5G
BOXTAL_SECRET_KEY=8b580fed-38da-4bd6-a607-3eae7399904c
```

Portail de gestion des commandes en production :
**https://shipping.boxtal.com/fr/fr/centrale-expeditions/mes-commandes**

### 4. Stripe — passer en mode live

1. Dans le dashboard Stripe : activer le compte (soumettre les infos KYB)
2. Récupérer `sk_live_…` (clé secrète serveur ; pas de clé publishable, Checkout par redirection)
3. Mettre à jour dans Vercel

### 5. Supabase — migrations en production

Même base Supabase utilisée en local et en prod.  
Appliquer les nouvelles migrations via le **SQL Editor** du dashboard Supabase, ou via :

```bash
DATABASE_URL=postgresql://... npm run migrate
```

### 6. Déploiement

Chaque push sur `main` déclenche un déploiement automatique sur Vercel.

```bash
git push origin main
```

---

## Cheat sheet — commandes utiles

```bash
npm run dev              # serveur local → port 3001
npm run build            # build production
npm run type-check       # vérification TypeScript (tsc --noEmit)
npm run migrate          # appliquer les migrations Supabase

# Stripe
stripe listen --forward-to localhost:3001/api/stripe/webhook
stripe trigger checkout.session.completed   # simuler un paiement réussi
```

---

## Architecture des services

| Service | Rôle | Dashboard |
|---------|------|-----------|
| **Vercel** | Hébergement + déploiement | https://vercel.com |
| **Supabase** | Base de données (table `orders`) | https://app.supabase.com |
| **Stripe** | Paiement (Checkout Session) | https://dashboard.stripe.com |
| **Resend** | Emails transactionnels | https://resend.com |
| **Boxtal** | Génération étiquettes colis | https://shipping.boxtal.com |
| **Vercel Blob** | Stockage logos clients | inclus dans Vercel |
