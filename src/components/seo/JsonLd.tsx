/**
 * Injecte un bloc JSON-LD (Schema.org) dans le `<head>`/DOM.
 * Échappe `<` pour empêcher toute fermeture de balise `</script>` malveillante.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
