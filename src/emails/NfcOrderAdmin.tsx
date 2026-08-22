import { Text, Link } from 'react-email'
import { EmailLayout, Hero, Card, InfoTable, InfoRow, Button, InternalFooter, Divider } from './components'
import { color, style } from './theme'
import { formatPrice } from '@/lib/utils'
import { formatDestination, type Order } from '@/types/order'

interface Props {
  order: Order
  appUrl: string
}

export default function NfcOrderAdmin({ order, appUrl }: Props) {
  const ref = `#${order.id.slice(0, 8).toUpperCase()}`
  const placed = new Date(order.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <EmailLayout
      preview={`Commande NFC ${ref} payée — ${order.company}, ${order.quantity} pcs`}
      tagline="Porte-clés NFC"
      footer={<InternalFooter note="Répondre à cet email écrit directement au client." />}
    >
      <Hero
        eyebrow="Commande payée"
        title={<>{formatPrice(order.total_amount)} · {order.quantity} porte-clés</>}
        lead={`Commande ${ref} — ${placed}`}
      />

      <Card title="Client">
        <InfoTable>
          <InfoRow label="Société" value={order.company} />
          <InfoRow
            label="Email"
            value={<Link href={`mailto:${order.email}`} style={style.link}>{order.email}</Link>}
          />
          <InfoRow
            label="Téléphone"
            value={<Link href={`tel:${order.phone}`} style={style.link}>{order.phone}</Link>}
          />
          <InfoRow label="Secteur" value={order.sector} last />
        </InfoTable>
      </Card>

      <Card title="Commande">
        <InfoTable>
          <InfoRow label="Quantité" value={`${order.quantity} porte-clés`} />
          <InfoRow label="Prix unitaire" value={formatPrice(order.unit_price)} />
          <InfoRow label="Total payé" value={formatPrice(order.total_amount)} accent last />
        </InfoTable>
        <Divider />
        <Text style={{ color: color.ink3, fontSize: 11, margin: '0 0 4px' }}>Destination NFC</Text>
        <Text style={{ color: color.ink1, fontSize: 13, lineHeight: '1.6', margin: 0, wordBreak: 'break-all' }}>
          {formatDestination(order.nfc_url)}
        </Text>
        {order.logo_url && (
          <Text style={{ margin: '12px 0 0' }}>
            <Link href={order.logo_url} style={{ ...style.link, fontSize: 13 }}>
              Télécharger le logo →
            </Link>
          </Text>
        )}
      </Card>

      {order.shipping_address && (
        <Card title="Livraison">
          <Text style={{ color: color.ink1, fontSize: 13, lineHeight: '1.65', margin: 0 }}>
            {order.shipping_name}<br />
            {order.shipping_address}<br />
            {order.shipping_address2 && <>{order.shipping_address2}<br /></>}
            {order.shipping_postal_code} {order.shipping_city}
          </Text>
        </Card>
      )}

      <Button href={`${appUrl}/admin/commandes/${order.id}`} showUrl={false}>
        Ouvrir dans l’admin →
      </Button>
    </EmailLayout>
  )
}
