import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { CLIENT_NAMESPACES } from './client-namespaces'
import fr from '../../messages/fr.json'
import en from '../../messages/en.json'

// Un composant 'use client' qui lit un namespace absent de CLIENT_NAMESPACES n'échoue
// pas visiblement : next-intl affiche la clé brute (« nfcForm.pricing.title ») au
// visiteur, en prod comme en dev. Ce test attrape l'oubli au moment du commit.

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name)
    if (e.isDirectory()) return walk(path)
    return /\.tsx?$/.test(e.name) ? [path] : []
  })
}

/** Namespaces lus par des composants client, avec le fichier qui les demande. */
function clientNamespaceUsages(): { file: string; namespace: string }[] {
  return walk('src').flatMap((file) => {
    const src = readFileSync(file, 'utf8')
    if (!/^['"]use client['"]/m.test(src)) return []
    return [...src.matchAll(/useTranslations\(\s*'([^']+)'/g)].map((m) => ({ file, namespace: m[1] }))
  })
}

function resolve(messages: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined),
    messages,
  )
}

const usages = clientNamespaceUsages()

describe('namespaces i18n envoyés au client', () => {
  it('trouve les composants client qui traduisent', () => {
    expect(usages.length).toBeGreaterThan(10)
  })

  it('sont tous dans CLIENT_NAMESPACES', () => {
    const missing = usages
      .filter((u) => !(CLIENT_NAMESPACES as readonly string[]).includes(u.namespace.split('.')[0]))
      .map((u) => `${u.file} → ${u.namespace}`)
    expect(missing, 'namespaces à ajouter dans src/i18n/client-namespaces.ts').toEqual([])
  })

  it('existent dans les deux fichiers de traduction', () => {
    const missing = usages.flatMap((u) => [
      ...(resolve(fr, u.namespace) ? [] : [`fr.json → ${u.namespace} (${u.file})`]),
      ...(resolve(en, u.namespace) ? [] : [`en.json → ${u.namespace} (${u.file})`]),
    ])
    expect(missing).toEqual([])
  })
})
