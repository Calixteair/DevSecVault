import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalShellComponent } from './legal-shell.component';

/**
 * /legal/notice — Mentions légales.
 */
@Component({
  selector: 'app-legal-notice',
  standalone: true,
  imports: [LegalShellComponent, RouterLink],
  template: `
    <app-legal-shell title="Mentions légales" description="Mentions légales de DevSecVault : éditeur, hébergeur, contact, directeur de la publication.">
      <h2>Éditeur</h2>
      <p>
        Calixte Reymond, particulier non professionnel, étudiant en
        cybersécurité, domicilié en France.<br />
        Service auto-hébergé à titre <strong>non commercial</strong>.
      </p>
      <p>
        Conformément à l'article 6-III-2 de la LCEN, l'éditeur, en sa
        qualité de particulier, n'est pas tenu de publier ses coordonnées
        personnelles complètes ; celles-ci ont été communiquées à
        l'hébergeur (voir section <em>Hébergeur</em>) et peuvent être
        sollicitées par l'autorité judiciaire.
      </p>
      <p>
        Contact public : <code>dsvabuse&#64;calixteair.fr</code>
      </p>

      <h2>Financement</h2>
      <p>
        Le service est financé sur les fonds propres de l'éditeur. Des
        dons libres peuvent être acceptés via PayPal sur la page
        <a routerLink="/support">Soutenir le projet</a>, à la seule fin
        de couvrir les frais d'infrastructure (VPS, nom de domaine,
        certificats, mail). Les dons ne donnent pas droit à un reçu
        fiscal et ne créent aucune obligation contractuelle.
      </p>

      <h2>Directeur de publication</h2>
      <p>
        L'éditeur lui-même.
      </p>

      <h2>Hébergeur</h2>
      <p>
        Hostinger International Ltd.<br />
        61 Lordou Vironos Street, 6023 Larnaca, Chypre.<br />
        Contact : via le panneau client Hostinger
        (<a href="https://www.hostinger.com" target="_blank" rel="noopener">hostinger.com</a>).<br />
        VPS situé en Europe.
      </p>

      <h2>Adresse de signalement</h2>
      <p>
        Pour signaler un contenu illicite ou un abus :
        <code>dsvabuse&#64;calixteair.fr</code> ou via le bouton
        <em>Signaler</em> présent sur les pages publiques.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L'apparence générale, les éléments graphiques et le code source de la
        plateforme sont la propriété de l'éditeur, sauf mention contraire.
        Les contenus publiés par les utilisateurs leur appartiennent (voir
        <a routerLink="/legal/terms">CGU</a>).
      </p>

      <h2>Crédits</h2>
      <ul>
        <li>Icônes : <a href="https://lucide.dev" target="_blank" rel="noopener">Lucide</a> (licence ISC).</li>
        <li>Polices : Inter et JetBrains Mono (auto-hébergées, licence SIL Open Font 1.1).</li>
        <li>Frameworks : Angular 21, Symfony 8.</li>
        <li>Authentification : Keycloak.</li>
        <li>Recherche : Meilisearch.</li>
      </ul>
    </app-legal-shell>
  `,
})
export class LegalNoticeComponent {}
