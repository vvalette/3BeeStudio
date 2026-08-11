'use client'

import { useEffect } from 'react'

/**
 * Avertit avant de quitter la page quand un champ admin a été modifié sans être
 * sauvegardé — les notes internes et le numéro de suivi n'ont pas d'autosave, et
 * on perdait la saisie en cliquant « Retour » sans un mot.
 *
 * `beforeunload` ne couvre que la fermeture d'onglet et le rechargement : les
 * navigations internes (App Router) ne le déclenchent pas. Les appelants doublent
 * donc l'avertissement d'un repère visuel « non sauvegardé » à côté du champ.
 */
export default function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      // Les navigateurs modernes ignorent le texte et affichent leur message natif,
      // mais `returnValue` reste requis pour que la confirmation s'affiche.
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])
}
