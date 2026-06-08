# Règles techniques — décisions prises

## Navbar & espacement

La navbar est `fixed inset-x-0 top-0 h-[72px]`.
Le `<main>` du root layout a `className="pt-[72px]"` — **source unique de vérité**.

```
✅ Layout <main className="pt-[72px]">
✅ Hero <section className="-mt-[72px]">  → fond plein écran, contenu interne pt-[88px]/pt-[72px]
✅ Pages internes : ajouter pt-4 à pt-8 max pour respiration
✅ min-h des pages : min-h-[calc(100dvh-72px)]
❌ Ne jamais ajouter pt-[72px] dans une page — le layout le fait déjà
```

## cursor-pointer obligatoire

Tous les éléments interactifs doivent avoir `cursor-pointer` (et `disabled:cursor-not-allowed` si désactivable) :
boutons, sélecteurs, options de formulaire, `<div onClick>`, `<li role="option">`.

Ne pas faire confiance au comportement par défaut du navigateur.

## Emails React Email

Pour centrer du texte dans un cercle dans un template email :

```ts
// ✅ Compatible Gmail + Outlook
const dot: React.CSSProperties = {
  display: 'inline-block',
  width: 22,
  height: 22,
  borderRadius: '50%',
  lineHeight: '22px',   // clé : égal à height
  textAlign: 'center',
}

// ❌ Ne pas utiliser
// display: 'inline-flex' + alignItems + justifyContent → ignoré par Outlook/Gmail
```

## Resend — pièges connus

- `onboarding@resend.dev` comme `from` → emails bloqués silencieusement sauf vers l'email du compte Resend
- `RESEND_FROM_EMAIL` doit être défini explicitement — ne pas laisser le fallback en prod
- Toujours ajouter `replyTo: 'contact@3beestudio.fr'` dans `resend.emails.send()`

## Stripe webhook — pattern double-check

En local le webhook ne peut pas atteindre localhost. Fallback implémenté dans la page suivi :
si `?payment=success` + statut `pending_payment` → `stripe.checkout.sessions.retrieve()` → update DB + email.

Protection anti-doublon : toutes les updates Supabase utilisent `.eq('status', 'pending_payment')` dans le WHERE.
