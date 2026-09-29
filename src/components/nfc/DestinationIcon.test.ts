import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import DestinationIcon from './DestinationIcon'

const render = (value: string) => renderToStaticMarkup(createElement(DestinationIcon, { value }))

describe('DestinationIcon', () => {
  it('distingue les réseaux, la fiche contact et un site', () => {
    const icons = [
      render('https://www.instagram.com/3bee_studio_'),
      render('https://www.tiktok.com/@3bee.studio'),
      render('https://www.linkedin.com/in/jean-dupont'),
      render('BEGIN:VCARD\nFN:Jean Dupont\nEND:VCARD'),
      render('https://exemple.fr'),
    ]
    expect(new Set(icons).size).toBe(5)
    for (const svg of icons) expect(svg).toMatch(/^<svg/)
  })

  it('une valeur qui n’est pas une URL retombe sur l’icône site', () => {
    expect(render('pas une url')).toBe(render('https://exemple.fr'))
  })
})
