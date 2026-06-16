# 08 — Stripe Setup (local & Vercel)

## 1. Clés API

Sur [dashboard.stripe.com](https://dashboard.stripe.com) → **Développeurs → Clés API** :

| Variable | Clé | Rôle |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` | Côté serveur uniquement |

> Le Checkout se fait par **redirection vers la page hébergée Stripe** (`session.url`) : pas de Stripe.js côté navigateur, donc **aucune clé publishable** (`pk_...`) n'est nécessaire.
> En développement, toujours utiliser la clé **test** (`sk_test_`).

---

## 2. Setup local

### Installer le Stripe CLI (WSL2/Ubuntu)

```bash
# Récupère la dernière version disponible
curl -sI https://github.com/stripe/stripe-cli/releases/latest | grep location
# → retourne la version ex: v1.42.1

# Télécharge et installe
curl -L https://github.com/stripe/stripe-cli/releases/download/v1.42.1/stripe_1.42.1_linux_x86_64.tar.gz -o stripe.tar.gz
tar -xzf stripe.tar.gz
sudo mv stripe /usr/local/bin/
stripe version
```

### Connexion

```bash
stripe login
```

Ouvre le lien affiché dans le navigateur et connecte-toi avec ton compte Stripe.

### Écouter les webhooks en local

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Au démarrage, le CLI affiche :

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxx
```

→ Copie cette valeur dans `.env.local` :

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxx
```

> Laisse `stripe listen` tourner dans un terminal dédié pendant le développement.

---

## 3. Setup Vercel (production)

### Variables d'environnement

Dans [vercel.com](https://vercel.com) → ton projet → **Settings → Environment Variables**, ajoute :

| Variable | Valeur |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (depuis le dashboard Stripe, voir ci-dessous) |

> En production, utilise la clé **live** (`sk_live_`). Pas de clé publishable nécessaire (Checkout par redirection).

### Créer le webhook sur le dashboard Stripe

1. Dashboard Stripe → **Développeurs → Webhooks → Ajouter un endpoint**
2. URL de l'endpoint : `https://3beestudio.fr/api/stripe/webhook`
3. Événements à écouter :
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Clique sur **Ajouter l'endpoint**
5. Dans la page de l'endpoint créé → **Signing secret → Révéler**
6. Copie la valeur `whsec_...` → colle-la dans la variable `STRIPE_WEBHOOK_SECRET` sur Vercel

### Résumé des différences local / prod

| | Local | Vercel (prod) |
|---|---|---|
| Clés | `sk_test_` (serveur) | `sk_live_` (serveur) |
| Webhook secret | Via `stripe listen` (CLI) | Via dashboard Stripe → endpoint |
| Endpoint webhook | `localhost:3001/api/stripe/webhook` | `https://3beestudio.fr/api/stripe/webhook` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://3beestudio.fr` |
