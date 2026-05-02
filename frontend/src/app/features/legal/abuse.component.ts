import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalShellComponent } from './legal-shell.component';

/**
 * /legal/abuse — Procédure de signalement (DSA notice-and-action).
 */
@Component({
  selector: 'app-legal-abuse',
  standalone: true,
  imports: [LegalShellComponent, RouterLink],
  template: `
    <app-legal-shell title="Signalement de contenu (DSA)">
      <h2>Procédure de signalement</h2>
      <p>
        Conformément au règlement européen sur les services numériques
        (DSA, règlement UE 2022/2065), tout utilisateur ou tiers peut
        signaler à l'éditeur tout contenu qu'il estime manifestement illicite.
      </p>
      <p>Deux moyens de signalement sont mis à votre disposition :</p>
      <ul>
        <li>
          <strong>Bouton <em>Signaler</em></strong> présent sur chaque page
          de contenu public (Dev Library, Cyber Toolbox).
        </li>
        <li>
          <strong>Adresse e-mail dédiée</strong> :
          <code>dsvabuse&#64;calixteair.fr</code>
        </li>
      </ul>

      <h2>Informations à fournir</h2>
      <p>
        Pour qu'un signalement soit traité efficacement, merci d'indiquer :
      </p>
      <ul>
        <li>L'URL ou l'identifiant du contenu signalé.</li>
        <li>Le motif (illégal, malware, phishing, droit d'auteur, etc.).</li>
        <li>
          Une brève description du problème, et le cas échéant les
          références juridiques pertinentes (titre, jugement, marque…).
        </li>
        <li>Vos coordonnées si vous souhaitez être informé du suivi.</li>
      </ul>

      <h2>Délai de traitement</h2>
      <p>
        L'éditeur s'engage à examiner tout signalement justifié dans un
        délai maximal de <strong>24 heures ouvrées</strong>. Le contenu
        manifestement illicite est retiré ou rendu inaccessible dans ce
        même délai.
      </p>

      <h2>Décision et recours</h2>
      <p>
        L'auteur du contenu et le signaleur (si identifié) sont informés
        de la décision : conservation, masquage (passage en privé) ou
        suppression définitive.
      </p>
      <p>
        En cas de désaccord avec une décision de modération, vous pouvez
        contester par e-mail à <code>dsvabuse&#64;calixteair.fr</code>. La
        décision sera réexaminée par l'éditeur.
      </p>

      <h2>Signalements abusifs</h2>
      <p>
        Les signalements manifestement infondés ou répétés à des fins de
        nuisance peuvent entraîner la suspension du compte du signaleur,
        conformément aux <a routerLink="/legal/terms">CGU</a>.
      </p>

      <h2>Signalements urgents</h2>
      <p>
        Pour les contenus relevant de la pédopornographie (CSAM), du
        terrorisme ou de menaces graves contre les personnes, vous pouvez
        en parallèle saisir :
      </p>
      <ul>
        <li>La plateforme française <a href="https://www.internet-signalement.gouv.fr" target="_blank" rel="noopener">Pharos</a>.</li>
        <li>Le portail européen <a href="https://stopline.inhope.org" target="_blank" rel="noopener">INHOPE</a>.</li>
      </ul>
    </app-legal-shell>
  `,
})
export class LegalAbuseComponent {}
