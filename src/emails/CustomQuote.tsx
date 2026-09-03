import { Text } from 'react-email'
import { EmailLayout, Hero, Card, Button, Note, TotalRow } from './components'
import { color, font } from './theme'
import type { CustomOrder, QuoteLineItem } from '@/types/custom-order'

/**
 * « Votre devis est prêt » — sur-mesure.
 *
 * L'email reprend les lignes du devis pour qu'il soit lisible sans ouvrir la
 * pièce jointe : sur mobile, beaucoup de clients n'affichent pas les PDF.
 *
 * Un devis importé n'a pas de lignes saisies (`items` vide) : on affiche alors
 * le total seul et on renvoie à la pièce jointe, plutôt que d'inventer un
 * détail que le PDF ne dirait pas.
 *
 * Sans `paymentUrl`, l'acompte se règle par virement : le bouton disparaît et
 * l'email dit où en est la suite, plutôt que de promettre un paiement en ligne
 * qui n'existe pas.
 */

interface Props {
  order: CustomOrder
  quoteNumber: string
  object: string
  items: QuoteLineItem[]
  total: number         // centimes
  deposit: number       // centimes
  validUntil: Date
  appUrl: string
  /** `null` quand l'acompte se règle par virement : pas de bouton de paiement. */
  paymentUrl: string | null
}

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`
}

function frDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })
}

export default function CustomQuote({
  order, quoteNumber, object, items, total, deposit, validUntil, appUrl, paymentUrl,
}: Props) {
  const balance = total - deposit
  const ref = order.id.slice(0, 8).toUpperCase()

  return (
    <EmailLayout
      preview={`Devis ${quoteNumber} · ${euros(total)}, acompte de ${euros(deposit)} pour lancer la production`}
      tagline="Sur-mesure"
    >
      <Hero
        eyebrow="Devis prêt"
        title={<>Votre devis est prêt.</>}
        lead={
          <>
            Bonjour {order.name}, voici le devis pour votre projet. Il est joint à cet email en PDF,
            et reste valable jusqu’au <strong style={{ color: color.ink0 }}>{frDate(validUntil)}</strong>.
          </>
        }
      />

      <Card>
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td>
                <Text style={{ color: color.ink3, fontSize: 11, margin: 0 }}>Devis n°</Text>
                <Text style={{ color: color.amberDeep, fontSize: 15, fontWeight: 700, fontFamily: font.mono, margin: '2px 0 0' }}>
                  {quoteNumber}
                </Text>
              </td>
              <td style={{ textAlign: 'right' }}>
                <Text style={{ color: color.ink3, fontSize: 11, margin: 0 }}>Référence demande</Text>
                <Text style={{ color: color.ink1, fontSize: 13, fontWeight: 600, fontFamily: font.mono, margin: '2px 0 0' }}>
                  #{ref}
                </Text>
              </td>
            </tr>
          </tbody>
        </table>
        {object && (
          <Text style={{ color: color.ink1, fontSize: 13, lineHeight: '1.6', margin: '14px 0 0' }}>
            <span style={{ color: color.ink3 }}>Objet : </span>{object}
          </Text>
        )}
      </Card>

      <Card title="Détail du devis">
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={2} style={{ paddingBottom: 12 }}>
                  <Text style={{ color: color.ink2, fontSize: 13, lineHeight: '1.6', margin: 0 }}>
                    Le détail des prestations figure sur le devis joint à cet email.
                  </Text>
                </td>
              </tr>
            )}
            {items.map((item, index) => (
              <tr key={`${item.label}-${index}`}>
                <td style={{ paddingBottom: 12, paddingRight: 12, verticalAlign: 'top' }}>
                  <Text style={{ color: color.ink0, fontSize: 13, fontWeight: 700, margin: 0 }}>{item.label}</Text>
                  {item.detail && (
                    <Text style={{ color: color.ink2, fontSize: 12, lineHeight: '1.5', margin: '2px 0 0', whiteSpace: 'pre-wrap' }}>
                      {item.detail}
                    </Text>
                  )}
                  <Text style={{ color: color.ink3, fontSize: 11, fontFamily: font.mono, margin: '4px 0 0' }}>
                    {item.quantity} × {euros(item.unit_price)}
                  </Text>
                </td>
                <td style={{ paddingBottom: 12, textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                  <Text style={{ color: color.ink0, fontSize: 13, fontWeight: 700, fontFamily: font.mono, margin: 0 }}>
                    {euros(item.quantity * item.unit_price)}
                  </Text>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={2} style={{ borderTop: `1px solid ${color.line2}`, paddingTop: 12 }} />
            </tr>
            <TotalRow label="Total du devis" value={euros(total)} strong />
          </tbody>
        </table>
        <Text style={{ color: color.ink3, fontSize: 11, margin: '12px 0 0' }}>
          TVA non applicable, art. 293 B du CGI.
        </Text>
      </Card>

      <Card tone="amber" title="Pour lancer la production">
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <TotalRow label="Acompte à régler maintenant" value={euros(deposit)} strong />
            {balance > 0 && (
              <tr>
                <td colSpan={2}>
                  <Text style={{ color: color.ink2, fontSize: 12, lineHeight: '1.6', margin: '10px 0 0' }}>
                    Le solde de <strong style={{ color: color.ink0 }}>{euros(balance)}</strong> vous sera
                    demandé une fois la pièce terminée, juste avant l’expédition.
                  </Text>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {paymentUrl ? (
        <>
          <Button href={paymentUrl}>Régler mon acompte →</Button>

          <Note>
            Paiement sécurisé par Stripe. Dès réception, nous lançons la fabrication et vous pouvez suivre
            l’avancement sur <a href={`${appUrl}/custom/${order.id}`} style={{ color: color.amberDeep, fontWeight: 600 }}>votre page de suivi</a>.
            Une question sur le devis ? Répondez simplement à cet email.
          </Note>
        </>
      ) : (
        <>
          <Card tone="amber" title="Règlement par virement">
            <Text style={{ color: color.ink1, fontSize: 13, lineHeight: '1.6', margin: 0 }}>
              L’acompte de <strong style={{ color: color.ink0 }}>{euros(deposit)}</strong> se règle par virement.
              Les coordonnées bancaires vous sont transmises à part, avec la référence{' '}
              <span style={{ fontFamily: font.mono, color: color.ink0 }}>#{ref}</span> à indiquer en libellé.
            </Text>
          </Card>

          <Note>
            Dès réception du virement, nous lançons la fabrication et vous pouvez suivre l’avancement
            sur <a href={`${appUrl}/custom/${order.id}`} style={{ color: color.amberDeep, fontWeight: 600 }}>votre page de suivi</a>.
            Une question sur le devis ? Répondez simplement à cet email.
          </Note>
        </>
      )}
    </EmailLayout>
  )
}
