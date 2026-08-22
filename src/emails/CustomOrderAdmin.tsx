import { Text, Link } from 'react-email'
import { EmailLayout, Hero, Card, InfoTable, InfoRow, Button, InternalFooter, Divider } from './components'
import { color, style } from './theme'
import { PROJECT_TYPES, type CustomOrder } from '@/types/custom-order'

interface Props {
  order: CustomOrder
  appUrl: string
}

const PROJECT_LABELS: Record<string, string> = Object.fromEntries(
  PROJECT_TYPES.map(({ value, label }) => [value, label]),
)

export default function CustomOrderAdmin({ order, appUrl }: Props) {
  const ref = `#${order.id.slice(0, 8).toUpperCase()}`
  const received = new Date(order.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <EmailLayout
      preview={`Nouvelle demande sur-mesure ${ref} — ${order.name}`}
      tagline="Sur-mesure"
      footer={<InternalFooter note="Répondre à cet email écrit directement au client." />}
    >
      <Hero
        eyebrow="Nouvelle demande"
        title={<>Demande {ref}</>}
        lead={`Reçue le ${received}`}
      />

      <Card title="Contact">
        <InfoTable>
          <InfoRow label="Nom" value={order.name} />
          {order.company && <InfoRow label="Société" value={order.company} />}
          <InfoRow
            label="Email"
            value={<Link href={`mailto:${order.email}`} style={style.link}>{order.email}</Link>}
            last={!order.phone}
          />
          {order.phone && (
            <InfoRow
              label="Téléphone"
              value={<Link href={`tel:${order.phone}`} style={style.link}>{order.phone}</Link>}
              last
            />
          )}
        </InfoTable>
      </Card>

      <Card title="Projet">
        <InfoTable>
          <InfoRow
            label="Type"
            value={PROJECT_LABELS[order.project_type] ?? order.project_type}
            last
          />
        </InfoTable>
        {order.reference_file_url && (
          <Text style={{ margin: '12px 0 0' }}>
            <Link href={order.reference_file_url} style={{ ...style.link, fontSize: 13 }}>
              Voir le fichier de référence →
            </Link>
          </Text>
        )}
        {order.description && (
          <>
            <Divider />
            <Text style={{ color: color.ink1, fontSize: 13, lineHeight: '1.65', margin: 0, whiteSpace: 'pre-wrap' }}>
              {order.description}
            </Text>
          </>
        )}
      </Card>

      {order.shipping_address && (
        <Card title="Livraison">
          <Text style={{ color: color.ink1, fontSize: 13, lineHeight: '1.65', margin: 0 }}>
            {order.shipping_name}<br />
            {order.shipping_address}<br />
            {order.shipping_postal_code} {order.shipping_city}
          </Text>
        </Card>
      )}

      <Button href={`${appUrl}/admin/custom/${order.id}`} showUrl={false}>
        Ouvrir dans l’admin →
      </Button>
    </EmailLayout>
  )
}
