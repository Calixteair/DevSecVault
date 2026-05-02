import { Component } from '@angular/core';
import { LegalShellComponent } from './legal-shell.component';

/**
 * /legal/terms — Conditions générales d'utilisation. Light, non-commercial
 * platform hosted by an individual in France: the rules below mirror the
 * LCEN host regime + DSA notice-and-action expectations.
 */
@Component({
  selector: 'app-legal-terms',
  standalone: true,
  imports: [LegalShellComponent],
  template: `
    <app-legal-shell title="Conditions générales d'utilisation">
      <h2>Préambule</h2>
      <p>
        DevSecVault est une plateforme web de partage de connaissances en
        cybersécurité, auto-hébergée et opérée à titre <strong>non commercial</strong>
        par un particulier en France. L'éditeur ne perçoit aucun revenu lié à
        l'exploitation du service.
      </p>
      <p>
        Le service est régi par la Loi pour la confiance dans l'économie
        numérique (LCEN, art. 6) et par le règlement européen sur les services
        numériques (DSA, règlement UE 2022/2065). En accédant à DevSecVault,
        vous acceptez les présentes CGU.
      </p>

      <h2>1. Comptes utilisateurs</h2>
      <ul>
        <li>Un compte par personne physique. La création d'un compte est gratuite.</li>
        <li>L'adresse e-mail fournie doit être valide et vérifiée par l'utilisateur.</li>
        <li>L'utilisateur est responsable de la confidentialité de ses identifiants.</li>
        <li>L'usurpation d'identité, la création de comptes multiples et l'usage de
          comptes au nom d'un tiers sans autorisation sont interdits.</li>
      </ul>

      <h2>2. Contenus interdits</h2>
      <p>L'utilisateur s'engage à ne pas publier, partager ou stocker via DevSecVault :</p>
      <ul>
        <li>Du <strong>malware fonctionnel</strong> destiné à cibler des systèmes ou
          personnes identifiables sans autorisation explicite.</li>
        <li>Des kits ou pages de <strong>phishing actif</strong> (en service et
          déployés contre des victimes).</li>
        <li>Tout contenu à caractère <strong>pédopornographique</strong> (CSAM).</li>
        <li>Du contenu faisant l'<strong>apologie du terrorisme</strong> ou
          incitant à la commission d'actes terroristes.</li>
        <li>Des contenus portant atteinte aux <strong>droits d'auteur</strong>
          ou aux droits voisins.</li>
        <li>Des <strong>données personnelles</strong> appartenant à autrui sans
          consentement (doxxing, fuites, identifiants).</li>
        <li>Des contenus à caractère diffamatoire, racistes, négationnistes,
          ou incitant à la haine.</li>
      </ul>
      <p>
        Le partage de techniques offensives à but pédagogique reste autorisé
        dans un cadre de recherche en sécurité informatique, à condition que
        les contenus ne ciblent pas un système ou une personne identifiable.
      </p>

      <h2>3. Modération et signalement</h2>
      <ul>
        <li>
          Tout contenu peut être signalé via l'adresse <code>dsvabuse&#64;calixteair.fr</code>
          ou via le bouton <em>Signaler</em> présent sur les pages publiques.
        </li>
        <li>
          L'éditeur s'engage à examiner tout signalement justifié dans un
          délai de <strong>24 heures ouvrées</strong> et à retirer ou désactiver
          le contenu manifestement illégal.
        </li>
        <li>
          Conformément à l'article 6 de la LCEN, l'éditeur n'est pas l'auteur
          des contenus publiés par ses utilisateurs. Sa responsabilité est
          engagée uniquement en cas de connaissance effective d'un contenu
          manifestement illégal et d'absence d'action de retrait.
        </li>
      </ul>

      <h2>4. Résiliation</h2>
      <ul>
        <li>L'utilisateur peut fermer son compte à tout moment depuis la page
          <em>Profil</em>.</li>
        <li>
          L'éditeur se réserve le droit de suspendre ou de fermer un compte en
          cas de violation des présentes CGU, sans préavis ni indemnité.
        </li>
      </ul>

      <h2>5. Disponibilité</h2>
      <p>
        Le service est fourni <em>en l'état</em>, sans garantie de disponibilité,
        de performance ou d'absence d'erreur. L'éditeur peut interrompre,
        suspendre ou faire évoluer le service à tout moment.
      </p>

      <h2>6. Propriété intellectuelle</h2>
      <p>
        L'utilisateur conserve la propriété des contenus qu'il publie. En les
        partageant publiquement sur DevSecVault, il accorde à la plateforme
        une licence non exclusive, gratuite et limitée à la diffusion via le
        service.
      </p>

      <h2>7. Droit applicable</h2>
      <p>
        Les présentes CGU sont régies par le droit français. En cas de
        litige, et à défaut d'accord amiable, les tribunaux du siège du
        défendeur seront seuls compétents.
      </p>

      <h2>8. Contact</h2>
      <p>
        Pour toute question relative aux présentes CGU :
        <code>dsvabuse&#64;calixteair.fr</code>.
      </p>
    </app-legal-shell>
  `,
})
export class LegalTermsComponent {}
