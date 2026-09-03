import { Text } from 'react-email'
import { EmailLayout, Hero, Card, Button, Note, TotalRow } from './components'
import { color } from './theme'
import type { CustomOrder } from '@/types/custom-order'

/**
 * « Votre projet est prêt, il reste le solde » — sur-mesure.
 * Envoyé quand la pièce est terminée, avant l'expédition.
 *
 * Sans `paymentUrl`, le solde se règle par virement : le bouton disparaît au
 * profit de la marche à suivre, coordonnées transmises à part.
 */

interface Props {
  order: CustomOrder
  amount: number        // solde, en centimes
  appUrl: string
  /** `null` quand le solde se règle par virement : pas de bouton de paiement. */
  paymentUrl: string | null
}

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`
}

export default function CustomBalance({ order, amount, appUrl, paymentUrl }: Props) {
  const ref = order.id.slice(0, 8).toUpperCase()
  const hasBreakdown = !!order.deposit_amount && !!order.total_amount

  return (
    <EmailLayout
      preview={`Votre projet est prêt : solde de ${euros(amount)} à régler avant expédition`}
      tagline="Sur-mesure"
    >
      <Hero
        eyebrow="Projet terminé"
        title={<>Votre projet est prêt.</>}
        lead={
          <>
            Bonjour {order.name}, votre pièce est terminée. Elle part dès le règlement du solde.
          </>
        }
      />

      <Card tone="amber">
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {hasBreakdown && (
              <>
                <TotalRow label="Total du projet" value={euros(order.total_amount!)} />
                <TotalRow label="Acompte déjà versé" value={`− ${euros(order.deposit_amount!)}`} />
                <tr>
                  <td colSpan={2} style={{ borderTop: `1px solid ${color.amberLine}`, paddingTop: 10 }} />
                </tr>
              </>
            )}
            <TotalRow label="Solde à régler" value={euros(amount)} strong />
          </tbody>
        </table>
      </Card>

      {paymentUrl ? (
        <Button href={paymentUrl}>Régler le solde →</Button>
      ) : (
        <Card tone="amber" title="Règlement par virement">
          <Text style={{ color: color.ink1, fontSize: 13, lineHeight: '1.6', margin: 0 }}>
            Le solde se règle par virement. Les coordonnées bancaires vous sont transmises à part,
            avec la référence #{ref} à indiquer en libellé.
          </Text>
        </Card>
      )}

      <Card title="Ensuite">
        <Text style={{ color: color.ink1, fontSize: 13, lineHeight: '1.65', margin: 0 }}>
          Dès le paiement reçu, votre colis part sous 24 à 48 h ouvrées. Vous recevrez un email
          avec le numéro de suivi dès la prise en charge par le transporteur.
        </Text>
      </Card>

      <Note>
        {paymentUrl ? 'Paiement sécurisé par Stripe. ' : ''}Suivi de votre projet :{' '}
        <a href={`${appUrl}/custom/${order.id}`} style={{ color: color.amberDeep, fontWeight: 600 }}>
          référence #{ref}
        </a>.
      </Note>
    </EmailLayout>
  )
}
