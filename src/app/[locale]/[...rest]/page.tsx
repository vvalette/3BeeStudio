import { notFound } from 'next/navigation'

// Catch-all : toute URL qui ne correspond à aucune route sous [locale]
// déclenche la 404 localisée (not-found.tsx) au lieu de la page Next.js par défaut.
export default function CatchAllPage() {
  notFound()
}
