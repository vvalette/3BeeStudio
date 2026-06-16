import Stripe from 'stripe'

// apiVersion épinglée sur celle du SDK (stripe@17.7.0) — évite tout changement
// de comportement silencieux si le compte Stripe migre de version.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})
