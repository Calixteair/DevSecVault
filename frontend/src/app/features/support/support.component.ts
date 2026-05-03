import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalShellComponent } from '../legal/legal-shell.component';

/**
 * /support — page « Soutenir le projet ». Don ponctuel via PayPal.me, sans
 * intégration backend (lien externe). La page rappelle explicitement que le
 * don est libre, non remboursable, non contractuel et ne confère aucun droit
 * particulier sur le service — pour rester aligné avec les CGU et préserver
 * le caractère non commercial du projet (les dons couvrent uniquement les
 * frais d'infra : VPS, domaine, certificats).
 */
@Component({
  selector: 'app-support',
  standalone: true,
  imports: [LegalShellComponent, RouterLink],
  template: `
    <app-legal-shell title="Soutenir le projet" [draft]="false">
      <h2>Pourquoi soutenir ?</h2>
      <p>
        DevSecVault est un projet personnel auto-hébergé, sans publicité,
        sans revente de données et sans modèle commercial. L'infrastructure
        (VPS, nom de domaine, certificats, mail transactionnel) a un coût
        récurrent assumé par l'éditeur à titre privé.
      </p>
      <p>
        Si l'outil vous est utile, vous pouvez contribuer à couvrir ces frais
        via un don libre. Aucune contrepartie n'est demandée et aucune
        fonctionnalité n'est réservée aux donateurs.
      </p>

      <h2>Faire un don</h2>
      <p>
        Le don se fait via <strong>PayPal.me</strong>, en quelques clics et
        sans création de compte côté DevSecVault :
      </p>
      <p>
        <a
          class="donate-cta"
          href="https://paypal.me/dropcalixteair"
          target="_blank"
          rel="noopener noreferrer"
        >
          Faire un don sur PayPal
        </a>
      </p>
      <p>
        Vous choisissez librement le montant. Les dons en euros sont les
        bienvenus, dans n'importe quelle devise supportée par PayPal.
      </p>

      <h2>Conditions du don</h2>
      <ul>
        <li>
          Le don est <strong>libre, ponctuel et non remboursable</strong>
          (sauf erreur manifeste de manipulation, à signaler sous 14 jours
          à l'adresse de contact ci-dessous).
        </li>
        <li>
          Il est <strong>non contractuel</strong> : il ne crée aucune
          obligation de service, de support, de maintien en ligne ni de
          fonctionnalité de la part de l'éditeur.
        </li>
        <li>
          Il <strong>ne confère aucun droit particulier</strong> sur la
          plateforme : pas de rôle premium, pas de quota augmenté, pas
          d'accès privilégié au contenu ou à la modération.
        </li>
        <li>
          Le don ne donne pas droit à un <strong>reçu fiscal</strong> :
          DevSecVault n'est pas une association reconnue d'utilité publique
          ni un organisme habilité à émettre des reçus au sens du Code
          général des impôts.
        </li>
        <li>
          Les dons reçus servent exclusivement à couvrir les frais
          d'infrastructure du service.
        </li>
      </ul>

      <h2>Traitement du paiement</h2>
      <p>
        Le paiement est traité exclusivement par <strong>PayPal (Europe)
        S.à r.l. et Cie, S.C.A.</strong>, conformément aux conditions
        générales et à la politique de confidentialité de PayPal
        (<a href="https://www.paypal.com/fr/legalhub" target="_blank" rel="noopener">paypal.com/fr/legalhub</a>).
        DevSecVault ne reçoit que le montant transféré et un identifiant
        de transaction ; aucune donnée bancaire (numéro de carte, IBAN)
        n'est transmise à la plateforme.
      </p>

      <h2>Transparence</h2>
      <p>
        L'éditeur reste un particulier, et non une entreprise commerciale.
        L'usage des dons fait l'objet d'un suivi interne ; aucun bilan
        public n'est publié à ce stade compte tenu du faible volume attendu.
      </p>

      <h2>Autres façons de contribuer</h2>
      <ul>
        <li>Signaler les bugs et les contenus litigieux via la page
          <a routerLink="/legal/abuse">Signalement</a>.</li>
        <li>Faire connaître DevSecVault à d'autres professionnels ou
          étudiants en cybersécurité.</li>
        <li>Proposer des améliorations (le projet sera ouvert en
          contributions ultérieurement).</li>
      </ul>

      <h2>Contact</h2>
      <p>
        Pour toute question relative aux dons :
        <code>dsvabuse&#64;calixteair.fr</code>.
      </p>
    </app-legal-shell>
  `,
  styles: [`
    .donate-cta {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.125rem;
      background: var(--primary);
      color: var(--primary-foreground);
      border-radius: var(--radius);
      font-weight: 600;
      font-size: 0.9375rem;
      text-decoration: none !important;
      transition: background-color 0.12s, transform 0.08s;
    }
    .donate-cta:hover {
      background: color-mix(in srgb, var(--primary) 88%, black);
      text-decoration: none !important;
    }
    .donate-cta:active { transform: translateY(1px); }
    .donate-cta:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }
  `],
})
export class SupportComponent {}
