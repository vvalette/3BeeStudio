import { Section, Text, Link } from 'react-email'
import { EmailLayout, Hero, Card, InfoTable, InfoRow, Button, Steps } from './components'
import { color, style } from './theme'
import { PROJECT_TYPES, type CustomOrder } from '@/types/custom-order'

interface Props {
  order: CustomOrder
  appUrl: string
}

const PROJECT_LABELS: Record<string, string> = Object.fromEntries(
  PROJECT_TYPES.map(({ value, label }) => [value, label]),
)

export default function CustomOrderConfirmation({ order, appUrl }: Props) {
  const trackUrl = `${appUrl}/custom/${order.id}`
  const ref = `#${order.id.slice(0, 8).toUpperCase()}`

  return (
    <EmailLayout
      preview={`Demande sur-mesure ${ref} bien reçue, devis sous 48h ouvrées`}
      tagline="Sur-mesure"
    >
      <Hero
        eyebrow="Demande reçue"
        title={<>Votre demande est bien<br />enregistrée.</>}
        lead={
          <>
            Nous l’étudions et vous enverrons un devis personnalisé sous{' '}
            <strong style={{ color: color.ink0 }}>48 h ouvrées</strong>.
          </>
        }
      />

      <Card>
        <InfoTable>
          <InfoRow label="Référence" value={ref} mono accent />
          <InfoRow
            label="Projet"
            value={PROJECT_LABELS[order.project_type] ?? order.project_type}
            last={!order.reference_file_url}
          />
        </InfoTable>
        {order.reference_file_url && (
          <Text style={{ margin: '12px 0 0' }}>
            <Link href={order.reference_file_url} style={{ ...style.link, fontSize: 13 }}>
              Voir le fichier de référence envoyé →
            </Link>
          </Text>
        )}
      </Card>

      {order.description && (
        <Card title="Votre description">
          <Text style={{ color: color.ink1, fontSize: 13, lineHeight: '1.65', margin: 0, whiteSpace: 'pre-wrap' }}>
            {order.description}
          </Text>
        </Card>
      )}

      <Section style={{ height: 8 }} />

      <Button href={trackUrl}>Suivre ma demande →</Button>

      <Card title="Prochaines étapes">
        <Steps
          items={[
            { title: 'Étude de votre projet', desc: 'Nous analysons votre demande et préparons un devis détaillé sous 48 h ouvrées.' },
            { title: 'Devis & acompte', desc: 'Vous recevez le devis en PDF par email. Un acompte valide la commande et lance la production.' },
            { title: 'Production & livraison', desc: 'Fabrication en France, solde réglé à la fin, puis expédition avec suivi.' },
          ]}
        />
      </Card>
    </EmailLayout>
  )
}
