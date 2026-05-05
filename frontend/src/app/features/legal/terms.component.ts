import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalShellComponent } from './legal-shell.component';

/**
 * /legal/terms — Conditions générales d'utilisation. Light, non-commercial
 * platform hosted by an individual in France: the rules below mirror the
 * LCEN host regime + DSA notice-and-action expectations.
 */
@Component({
  selector: 'app-legal-terms',
  standalone: true,
  imports: [LegalShellComponent, RouterLink],
  template: `
    <app-legal-shell title="Conditions générales d'utilisation" description="Conditions générales d'utilisation de DevSecVault : engagements, contenus interdits, modération, responsabilité éditoriale, droit français.">
      <h2>Préambule</h2>
      <p>
        DevSecVault est une plateforme web de partage de connaissances en
        cybersécurité, auto-hébergée et opérée à titre <strong>non commercial</strong>
        par un particulier en France. L'éditeur ne tire aucun bénéfice
        commercial du service. Des dons libres peuvent être acceptés via la
        page <a routerLink="/support">Soutenir le projet</a> à la seule fin
        de couvrir les frais d'infrastructure (voir conditions sur cette page).
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
          L'éditeur s'engage à examiner tout signalement dans les meilleurs
          délais et au plus tard sous <strong>7 jours</strong> ; le retrait
          du contenu manifestement illégal est effectué sans délai déraisonnable
          dès la prise de connaissance.
        </li>
        <li>
          Pour les contenus relevant de la <strong>pédopornographie (CSAM)</strong>,
          de l'<strong>apologie du terrorisme</strong> ou des <strong>menaces
          graves contre les personnes</strong>, le retrait est traité en
          priorité, dans l'esprit des dispositions du règlement (UE) 2021/784
          relatif aux contenus terroristes en ligne.
        </li>
        <li>
          Conformément à l'article 6 de la LCEN, l'éditeur n'est pas l'auteur
          des contenus publiés par ses utilisateurs. Sa responsabilité est
          engagée uniquement en cas de connaissance effective d'un contenu
          manifestement illégal et d'absence d'action de retrait.
        </li>
        <li>
          Les contenus chiffrés de bout-en-bout (Secure Bridge) ne peuvent
          techniquement pas être inspectés par l'éditeur ; leur destruction
          automatique sous 10 minutes en limite la durée de vie.
        </li>
      </ul>

      <h2>4. Résiliation</h2>
      <ul>
        <li>
          L'utilisateur peut demander à tout moment la suppression de son
          compte par e-mail à <code>dsvabuse&#64;calixteair.fr</code>. La
          suppression est effective sous 30 jours, conformément aux droits
          RGPD (voir <a routerLink="/legal/privacy">Politique de confidentialité</a>).
          Une interface de suppression en libre-service sera ajoutée
          ultérieurement.
        </li>
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
        une licence non exclusive, gratuite, mondiale et limitée à la durée
        de publication, à la seule fin de diffusion via le service. La licence
        prend fin lorsque l'utilisateur retire le contenu ou supprime son
        compte (sous réserve des copies de sauvegarde et obligations légales
        de conservation).
      </p>

      <h2>6 bis. Tokens d'accès personnels (PAT)</h2>
      <p>
        Les jetons d'accès personnels (préfixés <code>dvs_</code>) générés
        depuis la page <em>Settings → Tokens</em> permettent l'accès à l'API
        au nom de l'utilisateur. Celui-ci est seul responsable de leur
        confidentialité ; tout usage par un tiers est réputé effectué pour
        son compte. Les tokens compromis doivent être révoqués immédiatement.
      </p>

      <h2>7. Dons</h2>
      <p>
        DevSecVault peut recevoir des dons libres via PayPal, dans le seul
        but de couvrir les frais d'infrastructure. Le don est ponctuel,
        non remboursable (sauf erreur manifeste signalée sous 14 jours),
        non contractuel, et ne confère aucun droit particulier sur le
        service (pas de fonctionnalité réservée, pas de quota augmenté,
        pas d'accès privilégié). Les modalités sont décrites sur la page
        <a routerLink="/support">Soutenir le projet</a>.
      </p>
      <p>
        Le donateur ne reçoit pas de reçu fiscal : DevSecVault n'est pas
        un organisme habilité au sens des articles 200 et 238 bis du Code
        général des impôts.
      </p>

      <h2>8. Droit applicable</h2>
      <p>
        Les présentes CGU sont régies par le droit français. En cas de
        litige, et à défaut d'accord amiable, les tribunaux du siège du
        défendeur seront seuls compétents.
      </p>

      <h2>9. Contact</h2>
      <p>
        Pour toute question relative aux présentes CGU :
        <code>dsvabuse&#64;calixteair.fr</code>.
      </p>
    </app-legal-shell>
  `,
})
export class LegalTermsComponent {}
