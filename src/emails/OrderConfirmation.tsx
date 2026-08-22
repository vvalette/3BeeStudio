import { EmailLayout, Hero, Card, InfoTable, InfoRow, Button, Steps, TotalRow } from './components'
import { color } from './theme'

interface Props {
  company: string
  email: string
  quantity: number
  destination: string
  totalAmount: number
  orderId: string
  appUrl: string
}

export default function OrderConfirmation({
  company, quantity, destination, totalAmount, orderId, appUrl,
}: Props) {
  const ref = orderId.slice(0, 8).toUpperCase()
  const trackingUrl = `${appUrl}/suivi/${orderId}`
  const total = new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 0,
  }).format(totalAmount / 100)

  return (
    <EmailLayout
      preview={`Commande confirmée — ${quantity} porte-clés NFC pour ${company}`}
      tagline="Porte-clés NFC"
    >
      <Hero
        eyebrow="Paiement reçu"
        title={<>Votre commande est confirmée.</>}
        lead={
          <>
            Merci <strong style={{ color: color.ink0 }}>{company}</strong> — nous avons bien reçu votre
            paiement. Vos porte-clés vont être imprimés en 3D et programmés à la main dans nos studios.
          </>
        }
      />

      <Card title="Récapitulatif">
        <InfoTable>
          <InfoRow label="Référence" value={`#${ref}`} mono accent />
          <InfoRow label="Entreprise" value={company} />
          <InfoRow label="Quantité" value={`${quantity} porte-clés NFC`} />
          <InfoRow label="Destination NFC" value={destination} last />
        </InfoTable>
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse', marginTop: 12 }}>
          <tbody>
            <tr>
              <td colSpan={2} style={{ borderTop: `1px solid ${color.line2}`, paddingTop: 4 }} />
            </tr>
            <TotalRow label="Total réglé" value={total} strong />
          </tbody>
        </table>
      </Card>

      <Button href={trackingUrl}>Suivre ma commande →</Button>

      <Card title="Prochaines étapes">
        <Steps
          items={[
            { title: 'Validation sous 24 h', desc: 'Nous vérifions votre logo et vos paramètres NFC.' },
            { title: 'Impression & programmation', desc: 'Chaque porte-clé est imprimé puis programmé à la main.' },
            { title: 'Expédition', desc: 'Livraison suivie sous 5 à 10 jours ouvrés.' },
          ]}
        />
      </Card>
    </EmailLayout>
  )
}
