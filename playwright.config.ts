import { defineConfig, devices } from '@playwright/test'

/**
 * Tests E2E smoke — hermétiques : ils tournent avec des variables d'env factices
 * (pas de Supabase/Stripe réels), donc ils valident le rendu des pages et la
 * navigation des formulaires, pas les paiements de bout en bout.
 *
 * Prérequis : un build de prod (`npm run build`) — le webServer lance `next start`.
 * En local, si `next dev` tourne déjà sur .next :
 *   NEXT_BUILD_DIR=.next-e2e npm run build && NEXT_BUILD_DIR=.next-e2e npm run test:e2e
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3187',
    // Sans ça, Playwright envoie Accept-Language: en-US et le middleware
    // next-intl sert la version EN sur les URL FR.
    locale: 'fr-FR',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Audience TikTok/Instagram → le mobile est le cas nominal
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npx next start --port 3187',
    url: 'http://localhost:3187',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
