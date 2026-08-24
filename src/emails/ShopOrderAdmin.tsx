import { Section, Text, Link } from 'react-email'
import { EmailLayout, Hero, Card, InfoTable, InfoRow, Button, Pill, TotalRow, InternalFooter } from './components'
import { color, font, style } from './theme'
import { formatPrice } from '@/lib/utils'
import type { ShopOrder } from '@/types/shop-order'
import { discountLabel } from '@/lib/promo'

interface Props {
  order: ShopOrder
  appUrl: string
}

export default function ShopOrderAdmin({ order, appUrl }: Props) {
  const ref      = `#${order.id.slice(0, 8).toUpperCase()}`
  const isPickup = order.delivery_mode === 'pickup'
  const isRelay  = order.delivery_mode === 'relay'
  // Commande 100 % fichiers : livrée automatiquement au paiement. Aucune étiquette,
  // aucun colis, aucune action — l'email doit le dire au lieu de réclamer une
  // expédition qui n'existe pas.
  const isDigitalOnly = order.delivery_mode === 'digital'
  // Panier mixte : il y a un colis ET des fichiers déjà partis.
  const isMixed  = order.has_digital && order.has_physical
  const items    = order.items ?? []
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0)
  const unit     = isDigitalOnly ? 'fichier' : 'article'

  const placed = new Date(order.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <EmailLayout
      preview={`${isDigitalOnly ? 'Vente de fichiers' : 'Commande boutique'} ${ref} — ${order.name}`}
      tagline="Boutique"
      footer={<InternalFooter note="Répondre à cet email écrit directement au client." />}
    >
      <Hero
        eyebrow={isDigitalOnly ? 'Vente de fichiers' : 'Nouvelle commande'}
        title={<>{formatPrice(order.total_amount)} · {totalQty} {unit}{totalQty > 1 ? 's' : ''}</>}
        lead={`Commande ${ref} — ${placed}`}
      />

      {/* Mode de livraison — l'info qui décide de l'action à mener */}
      <Section style={{ textAlign: 'center', marginBottom: 20 }}>
        <Pill tone={isDigitalOnly ? 'cyan' : isPickup ? 'info' : 'positive'}>
          {isDigitalOnly
            ? 'Téléchargement — rien à faire'
            : isPickup
              ? 'Retrait au studio — pas d’expédition'
              : isRelay
                ? 'Point relais — étiquette à générer'
                : 'Livraison à domicile — étiquette à générer'}
        </Pill>
        {isMixed && (
          <Text style={{ color: color.ink3, fontSize: 11, margin: '8px 0 0' }}>
            Panier mixte : les fichiers sont déjà livrés, seul le colis reste à sortir.
          </Text>
        )}
      </Section>

      <Card title="Client">
        <InfoTable>
          <InfoRow label="Nom" value={order.name} />
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

      <Card title="Articles">
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {items.map((item, i) => (
              <tr key={`${item.product_id}-${i}`}>
                <td style={{ paddingBottom: 10, paddingRight: 12, verticalAlign: 'top' }}>
                  <Text style={{ color: color.ink0, fontSize: 13, fontWeight: 600, margin: 0 }}>
                    {item.quantity} × {item.product_name}
                  </Text>
                  {(item.custom_field_values ?? []).map((f) => (
                    <Text key={f.key} style={{ color: color.ink3, fontSize: 11, margin: '2px 0 0' }}>
                      {f.label} : {f.value}
                    </Text>
                  ))}
                </td>
                <td style={{ paddingBottom: 10, textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                  <Text style={{ color: color.ink1, fontSize: 13, fontFamily: font.mono, margin: 0 }}>
                    {formatPrice(item.unit_price * item.quantity)}
                  </Text>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={2} style={{ borderTop: `1px solid ${color.line2}`, paddingTop: 12 }} />
            </tr>
            <TotalRow label="Sous-total" value={formatPrice(order.subtotal)} />
            {order.discount_amount > 0 && (
              <TotalRow label={discountLabel(order)} value={`− ${formatPrice(order.discount_amount)}`} />
            )}
            {/* Pas de ligne « Livraison : Offerte » sur une vente de fichiers :
                il n'y a pas de port, pas même à zéro. */}
            {!isDigitalOnly && (
              <TotalRow label="Livraison" value={order.shipping === 0 ? 'Offerte' : formatPrice(order.shipping)} />
            )}
            <TotalRow label="Total payé" value={formatPrice(order.total_amount)} strong />
          </tbody>
        </table>
      </Card>

      {/* Point relais — l'info clé pour l'étiquette */}
      {isRelay && order.pickup_point_name && (
        <Card title="Point relais choisi">
          <Text style={{ color: color.ink1, fontSize: 13, lineHeight: '1.65', margin: 0 }}>
            <strong style={{ color: color.ink0 }}>{order.pickup_point_name}</strong><br />
            {order.pickup_point_street}<br />
            {order.pickup_point_postal_code} {order.pickup_point_city}
          </Text>
          <Text style={{ color: color.ink3, fontSize: 11, fontFamily: font.mono, margin: '6px 0 0' }}>
            Code Boxtal : {order.pickup_point_code}
          </Text>
        </Card>
      )}

      {/* Adresse — absente en retrait studio */}
      {!isPickup && order.shipping_address && (
        <Card title="Adresse de livraison">
          <Text style={{ color: color.ink1, fontSize: 13, lineHeight: '1.65', margin: 0 }}>
            {order.shipping_name}<br />
            {order.shipping_address}<br />
            {order.shipping_address2 && <>{order.shipping_address2}<br /></>}
            {order.shipping_postal_code} {order.shipping_city}<br />
            {order.shipping_country}
          </Text>
        </Card>
      )}

      {/* Vente de fichiers : dire explicitement qu'il n'y a rien à faire, sinon
          l'email se lit comme une commande à traiter. */}
      {isDigitalOnly && (
        <Card title="Aucune action requise">
          <Text style={{ color: color.ink1, fontSize: 13, lineHeight: '1.65', margin: 0 }}>
            Les liens de téléchargement ont été ouverts automatiquement et envoyés au client.
            La commande est marquée comme livrée : rien à imprimer, rien à expédier.
          </Text>
          <Text style={{ color: color.ink2, fontSize: 11, lineHeight: '1.6', margin: '10px 0 0' }}>
            Comptabilité : recette de <strong style={{ color: color.ink0 }}>prestation de service</strong>,
            à déclarer séparément des ventes de marchandises.
          </Text>
        </Card>
      )}

      <Button href={`${appUrl}/admin/boutique/commande/${order.id}`} showUrl={false}>
        {isDigitalOnly || isPickup ? 'Ouvrir dans l’admin →' : 'Préparer l’expédition →'}
      </Button>
    </EmailLayout>
  )
}
