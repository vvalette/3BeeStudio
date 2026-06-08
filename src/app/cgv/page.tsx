import LegalLayout from '@/components/ui/LegalLayout'

export const metadata = { title: 'Conditions Générales de Vente' }

export default function CGV() {
  return (
    <LegalLayout title="Conditions Générales de Vente" lastUpdated="Juin 2026">
      <div className="info-box">
        <strong>3BeeStudio</strong> — Micro-entreprise<br />
        VALETTE Valentin — 144 rue de la République, 69220 Belleville-en-Beaujolais<br />
        SIREN : 931 419 550 · SIRET : 931 419 550 00039<br />
        <a href="mailto:contact@3beestudio.fr">contact@3beestudio.fr</a> · 3beestudio.fr
      </div>

      <h2>Article 1 — Objet</h2>
      <p>
        Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles
        entre 3BeeStudio et tout client souhaitant acquérir un produit ou service proposé sur le site
        <strong> 3beestudio.fr</strong>. Toute commande implique l&apos;acceptation sans réserve des présentes CGV.
      </p>

      <h2>Article 2 — Produits et services</h2>
      <p>3BeeStudio propose deux types de commandes :</p>
      <ul>
        <li><strong>Objets de série</strong> : produits disponibles en boutique, expédiés sous 48h à 5 jours ouvrés.</li>
        <li><strong>Créations sur mesure</strong> : objets conçus et fabriqués selon les spécifications du client.
          Un devis est établi avant toute production. Un acompte de 50% est requis à la commande.</li>
        <li><strong>Porte-clés connectés</strong> : porte-clés 3D personnalisés avec puce NFC intégrée.
          La destination de la puce NFC est programmée selon le choix indiqué par le client à la commande.</li>
      </ul>
      <p>
        Tous les objets sont fabriqués en France. Les photos et visuels sont fournis à titre
        illustratif ; de légères variations de couleur peuvent apparaître selon le filament utilisé.
      </p>

      <h2>Article 3 — Prix</h2>
      <p>
        Les prix sont indiqués en euros TTC. 3BeeStudio, en tant que micro-entreprise,
        n&apos;est pas assujettie à la TVA (article 293 B du CGI). Les prix sont susceptibles
        d&apos;être modifiés à tout moment ; le prix applicable est celui affiché au moment de la commande.
      </p>
      <p>
        Les frais de livraison sont indiqués au moment du paiement et sont à la charge du client,
        sauf mention contraire lors d&apos;une offre promotionnelle.
      </p>

      <h2>Article 4 — Commande et paiement</h2>
      <p>
        Les commandes sont passées directement sur le site. Le paiement est sécurisé via
        <strong> Stripe</strong> et accepte les cartes bancaires (Visa, Mastercard, American Express)
        ainsi que les solutions de paiement compatibles.
      </p>
      <p>
        Pour les créations sur mesure, la commande est confirmée à réception de l&apos;acompte de 50%.
        Le solde est réglé à la livraison ou avant expédition.
      </p>
      <p>
        3BeeStudio se réserve le droit d&apos;annuler toute commande en cas de problème
        de disponibilité ou d&apos;erreur manifeste sur le prix.
      </p>

      <h2>Article 5 — Livraison</h2>
      <ul>
        <li>Objets de série : expédition sous 2 à 5 jours ouvrés.</li>
        <li>Créations sur mesure : délai précisé dans le devis (généralement 7 à 14 jours).</li>
        <li>Livraison en France métropolitaine par transporteur (Colissimo ou équivalent).</li>
        <li>Un numéro de suivi est communiqué par email dès l&apos;expédition.</li>
      </ul>
      <p>
        En cas de retard de livraison imputable au transporteur, 3BeeStudio ne pourra
        être tenu responsable mais s&apos;engage à accompagner le client dans la résolution du problème.
      </p>

      <h2>Article 6 — Droit de rétractation</h2>
      <p>
        Conformément à l&apos;article L221-18 du Code de la consommation, le client dispose
        d&apos;un délai de <strong>14 jours</strong> à compter de la réception pour exercer son droit de rétractation,
        sans justification, pour les produits de série.
      </p>
      <p>
        <strong>Exception :</strong> le droit de rétractation ne s&apos;applique pas aux produits
        fabriqués selon les spécifications du client (sur mesure, porte-clés personnalisés),
        conformément à l&apos;article L221-28 du Code de la consommation.
      </p>
      <p>
        Pour exercer ce droit, contactez-nous à{' '}
        <a href="mailto:contact@3beestudio.fr">contact@3beestudio.fr</a>.
        Les frais de retour sont à la charge du client. Le remboursement est effectué
        sous 14 jours après réception du retour.
      </p>

      <h2>Article 7 — Garanties</h2>
      <p>
        Tous les produits bénéficient de la garantie légale de conformité (articles L217-4 et suivants
        du Code de la consommation) et de la garantie contre les vices cachés
        (articles 1641 et suivants du Code civil).
      </p>
      <p>
        En cas de produit défectueux, contactez-nous dans les meilleurs délais avec photos à l&apos;appui.
        Nous procéderons au remplacement ou au remboursement selon le cas.
      </p>

      <h2>Article 8 — Responsabilité</h2>
      <p>
        3BeeStudio ne saurait être tenu responsable des dommages indirects liés à l&apos;utilisation
        des produits. La responsabilité est limitée au montant de la commande concernée.
      </p>

      <h2>Article 9 — Données personnelles</h2>
      <p>
        Les données collectées lors de la commande sont utilisées uniquement dans le cadre
        du traitement et de la livraison de celle-ci. Consultez notre{' '}
        <a href="/politique-de-confidentialite">Politique de confidentialité</a> pour plus d&apos;informations.
      </p>

      <h2>Article 10 — Litiges</h2>
      <p>
        En cas de litige, une solution amiable sera recherchée en priorité. À défaut,
        le client peut recourir à la médiation via la plateforme européenne de règlement en ligne
        des litiges : <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a>.
      </p>
      <p>
        Les présentes CGV sont soumises au droit français. Tout litige sera soumis
        à la compétence des tribunaux de Villefranche-sur-Saône.
      </p>
    </LegalLayout>
  )
}
