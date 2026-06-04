import LegalLayout from '@/components/ui/LegalLayout'

export const metadata = { title: 'Mentions légales' }

export default function MentionsLegales() {
  return (
    <LegalLayout title="Mentions légales" lastUpdated="Juin 2026">
      <div className="info-box">
        <strong>3BeeStudio</strong><br />
        Micro-entreprise — VALETTE Valentin<br />
        144 rue de la République, 69220 Belleville-en-Beaujolais<br />
        SIREN : 931 419 550 · SIRET : 931 419 550 00039<br />
        Email : <a href="mailto:contact@3beestudio.fr">contact@3beestudio.fr</a>
      </div>

      <h2>Éditeur du site</h2>
      <p>
        Le site <strong>3beestudio.fr</strong> est édité par la micro-entreprise 3BeeStudio,
        spécialisée dans le design 3D et la fabrication sur mesure d&apos;objets imprimés en France.
      </p>

      <h2>Hébergement</h2>
      <p>
        Ce site est hébergé par <strong>Vercel Inc.</strong><br />
        440 N Barranca Ave #4133, Covina, CA 91723, États-Unis<br />
        <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a>
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des contenus présents sur ce site (textes, images, logo, design, visuels)
        sont la propriété exclusive de 3BeeStudio, sauf mention contraire.
        Toute reproduction ou diffusion sans autorisation écrite préalable est interdite.
      </p>

      <h2>Responsabilité</h2>
      <p>
        3BeeStudio s&apos;efforce de maintenir les informations du site à jour et exactes.
        Toutefois, la responsabilité de l&apos;éditeur ne saurait être engagée en cas d&apos;erreur
        ou d&apos;omission. Les liens vers des sites tiers sont fournis à titre indicatif.
      </p>

      <h2>Droit applicable</h2>
      <p>
        Le présent site et ses contenus sont soumis au droit français.
        Tout litige relatif à l&apos;utilisation du site sera soumis à la compétence
        des tribunaux de Villefranche-sur-Saône.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question relative aux mentions légales :<br />
        <a href="mailto:contact@3beestudio.fr">contact@3beestudio.fr</a>
      </p>
    </LegalLayout>
  )
}
