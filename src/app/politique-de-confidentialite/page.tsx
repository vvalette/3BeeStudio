import LegalLayout from '@/components/ui/LegalLayout'

export const metadata = { title: 'Politique de confidentialité' }

export default function PolitiqueConfidentialite() {
  return (
    <LegalLayout title="Politique de confidentialité" lastUpdated="Juin 2026">
      <p>
        3BeeStudio accorde une importance primordiale à la protection de vos données personnelles.
        Cette politique explique quelles données nous collectons, comment nous les utilisons
        et vos droits en tant qu&apos;utilisateur.
      </p>

      <h2>1. Responsable du traitement</h2>
      <div className="info-box">
        <strong>3BeeStudio</strong> — Micro-entreprise<br />
        VALETTE Valentin — 144 rue de la République, 69220 Belleville-en-Beaujolais<br />
        SIREN : 931 419 550 · SIRET : 931 419 550 00039<br />
        <a href="mailto:contact@3beestudio.fr">contact@3beestudio.fr</a>
      </div>

      <h2>2. Données collectées</h2>
      <h3>Lors d&apos;une commande</h3>
      <ul>
        <li>Nom, prénom, adresse email</li>
        <li>Adresse de livraison</li>
        <li>Données de paiement (traitées directement par Stripe — non stockées par 3BeeStudio)</li>
        <li>Historique des commandes</li>
      </ul>

      <h3>Lors de la navigation</h3>
      <ul>
        <li>Données de navigation anonymisées (pages visitées, durée)</li>
        <li>Adresse IP (anonymisée)</li>
        <li>Type de navigateur et appareil</li>
      </ul>

      <h3>Via le formulaire de contact / newsletter</h3>
      <ul>
        <li>Adresse email</li>
        <li>Contenu du message (formulaire contact)</li>
      </ul>

      <h2>3. Finalités du traitement</h2>
      <ul>
        <li><strong>Traitement des commandes</strong> : gestion, production, expédition, facturation</li>
        <li><strong>Communication</strong> : confirmation de commande, suivi de livraison, SAV</li>
        <li><strong>Newsletter</strong> : envoi de nos actualités (avec consentement explicite)</li>
        <li><strong>Amélioration du site</strong> : analyse d&apos;audience anonyme</li>
        <li><strong>Obligations légales</strong> : conservation des données comptables</li>
      </ul>

      <h2>4. Base légale</h2>
      <ul>
        <li>Exécution du contrat (commandes)</li>
        <li>Consentement (newsletter, cookies non essentiels)</li>
        <li>Obligation légale (données comptables)</li>
        <li>Intérêt légitime (amélioration du service)</li>
      </ul>

      <h2>5. Durée de conservation</h2>
      <ul>
        <li>Données de commande : 5 ans (obligation comptable)</li>
        <li>Données newsletter : jusqu&apos;à désinscription</li>
        <li>Données de navigation : 13 mois maximum</li>
      </ul>

      <h2>6. Partage des données</h2>
      <p>
        Vos données ne sont jamais vendues. Elles peuvent être partagées uniquement avec :
      </p>
      <ul>
        <li><strong>Stripe</strong> : paiement sécurisé (<a href="https://stripe.com/fr/privacy" target="_blank" rel="noopener noreferrer">politique Stripe</a>)</li>
        <li><strong>Transporteurs</strong> : pour la livraison (nom, adresse)</li>
        <li><strong>Vercel</strong> : hébergement du site (<a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">politique Vercel</a>)</li>
      </ul>

      <h2>7. Cookies</h2>
      <p>
        Nous utilisons uniquement des cookies strictement nécessaires au bon fonctionnement
        du site (session, panier). Aucun cookie publicitaire ou de tracking tiers n&apos;est déposé
        sans votre consentement.
      </p>

      <h2>8. Vos droits (RGPD)</h2>
      <p>Conformément au RGPD, vous disposez des droits suivants :</p>
      <ul>
        <li><strong>Droit d&apos;accès</strong> : obtenir une copie de vos données</li>
        <li><strong>Droit de rectification</strong> : corriger des données inexactes</li>
        <li><strong>Droit à l&apos;effacement</strong> : supprimer vos données</li>
        <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format lisible</li>
        <li><strong>Droit d&apos;opposition</strong> : vous opposer à certains traitements</li>
        <li><strong>Droit de retrait du consentement</strong> : à tout moment pour la newsletter</li>
      </ul>
      <p>
        Pour exercer ces droits : <a href="mailto:contact@3beestudio.fr">contact@3beestudio.fr</a>.
        Nous répondrons dans un délai de 30 jours. Vous pouvez également introduire une réclamation
        auprès de la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">CNIL</a>.
      </p>

      <h2>9. Sécurité</h2>
      <p>
        Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger
        vos données (connexion HTTPS, accès restreint, hébergement sécurisé).
        Les données de paiement sont traitées directement par Stripe et ne transitent
        jamais par nos serveurs.
      </p>

      <h2>10. Contact DPO</h2>
      <p>
        Pour toute question relative à vos données personnelles :<br />
        <a href="mailto:contact@3beestudio.fr">contact@3beestudio.fr</a>
      </p>
    </LegalLayout>
  )
}
