import { test, expect } from '@playwright/test'

// Smoke tests des 3 flux + pages clés. Hermétiques : env factice, pas d'appel
// Supabase/Stripe réel — on valide le rendu, la navigation multi-step et la
// validation client, pas le paiement.

test.describe('Landing', () => {
  test('la home affiche le hero et la navbar', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Impression 3D')
    await expect(page.getByRole('navigation')).toBeVisible()
  })

  test('la home EN est servie sous /en', async ({ page }) => {
    await page.goto('/en')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })
})

test.describe('Flux NFC', () => {
  test('la page /nfc affiche le formulaire multi-step', async ({ page }) => {
    await page.goto('/nfc')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('NFC')
    // Le formulaire de commande est présent avec son bouton Suivant
    await expect(page.getByRole('button', { name: 'Suivant' }).first()).toBeVisible()
  })
})

test.describe('Flux sur-mesure', () => {
  test('le formulaire /custom navigue entre les étapes', async ({ page }) => {
    await page.goto('/custom')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('On la fabrique')

    // Étape 1 : type de projet + description
    await page.getByRole('button', { name: /Cadeau/i }).click()
    await page.getByRole('textbox').first().fill('Une figurine personnalisée pour un anniversaire, environ 15 cm.')
    await page.getByRole('button', { name: /^Continuer →$/ }).click()

    // Étape 2 : coordonnées visibles
    await expect(page.getByText('Prénom').first()).toBeVisible()

    // Retour → l'étape 1 conserve la description
    await page.getByRole('button', { name: 'Retour' }).click()
    await expect(page.getByRole('textbox').first()).toHaveValue(/figurine personnalisée/)
  })
})

test.describe('Flux boutique', () => {
  test('le catalogue /boutique rend la page (état vide sans DB)', async ({ page }) => {
    await page.goto('/boutique')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Impressions 3D')
  })
})

test.describe('Contact', () => {
  test('le formulaire valide côté client avant envoi', async ({ page }) => {
    await page.goto('/contact')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Soumission vide → erreurs de validation, pas d'appel réseau
    await page.getByRole('button', { name: /Envoyer le message/ }).click()
    await expect(page.getByText('Votre nom est requis (2 caractères min.)')).toBeVisible()
    await expect(page.getByText('Adresse email invalide')).toBeVisible()
  })
})

test.describe('Pages d’erreur', () => {
  test('une URL inconnue affiche la 404 localisée FR', async ({ page }) => {
    const response = await page.goto('/cette-page-n-existe-pas')
    expect(response?.status()).toBe(404)
    await expect(page.getByText('Page introuvable')).toBeVisible()
    await expect(page.getByRole('link', { name: /Retour à l.accueil/ })).toBeVisible()
  })

  test('une URL inconnue EN affiche la 404 localisée EN', async ({ page }) => {
    const response = await page.goto('/en/no-such-page')
    expect(response?.status()).toBe(404)
    await expect(page.getByText('Page not found')).toBeVisible()
  })
})
