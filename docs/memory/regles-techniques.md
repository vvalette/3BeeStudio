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

Header des emails : **texte uniquement** (`🐝 3BeeStudio` en amber bold + sous-titre), pas d'image PNG.
→ Meilleure compatibilité Gmail/Outlook, pas de dépendance à l'URL publique de l'image.

```tsx
// ✅ Pattern header email
<Section style={{ background: 'linear-gradient(135deg, #1A1300 0%, #111113 100%)', ... }}>
  <Text style={{ fontSize: 22, fontWeight: 800, color: '#F59E0B', ... }}>🐝 3BeeStudio</Text>
  <Text style={{ fontSize: 12, color: '#54545A', ... }}>Impression 3D · [Sous-titre]</Text>
</Section>
```

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

Le webhook gère deux types de paiement :
1. **NFC** : `session.metadata.order_id` présent → met à jour `orders`
2. **Custom acompte** : `session.metadata.custom_order_id` + `type === 'custom_deposit'` → met à jour `custom_orders`

## Formulaires multi-step avec react-hook-form + Zod

Les champs pilotés via `setValue` (boutons, pills) **doivent être enregistrés** avec un `<input type="hidden" {...register('field')} />` hors des blocs conditionnels, sinon `trigger()` ne les trouve pas.

```tsx
// ✅ Toujours en dehors du {step === 1 && ...}
<input type="hidden" {...register('project_type')} />
<input type="hidden" {...register('budget_range')} />
```

## Build avec dev server actif

Le répertoire `.next` est partagé entre dev et build → conflict.
Utiliser `NEXT_BUILD_DIR=.next-build npm run build` pour builder en parallèle du dev server.

## Composant Select custom (`src/components/ui/Select.tsx`)

Dropdown avec portal, animation, navigation clavier, coche amber. Accepte `compact` boolean pour une version plus petite (`px-2.5 py-1.5 text-xs rounded-lg`).

Toujours utiliser ce composant à la place du `<select>` natif dans l'UI admin/formulaires.

## Suppression admin

Les suppressions (NFC et custom) passent par des appels `DELETE` individuels en parallèle (`Promise.all`).
Toujours confirmer via `window.confirm` avant suppression — acceptable pour un outil admin.

## "sous 48h" — ne pas couper

Utiliser `style={{ whiteSpace: 'nowrap' }}` sur les spans contenant "sous 48h" pour éviter qu'ils wrappent entre "sous" et "48h".
