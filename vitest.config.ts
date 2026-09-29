import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // `server-only` lève hors d'un bundle serveur React : les tests tournent en Node pur.
      'server-only': path.resolve(__dirname, './node_modules/server-only/empty.js'),
    },
  },
  // `tsconfig.json` fixe jsx: 'preserve' (Next.js compile lui-même le JSX) —
  // Vite reçoit alors du JSX brut et n'arrive pas à le parser. Sans ça, aucun
  // test ne peut importer un template d'email.
  oxc: {
    jsx: { runtime: 'automatic' },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
