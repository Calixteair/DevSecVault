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
    <app-legal-shell title="Mentions légales">
      <h2>Éditeur</h2>
      <p>
        Calixte Reymond, étudiant en cybersécurité, France.<br />
        Service auto-hébergé à titre <strong>non commercial</strong>.
      </p>
      <p>
        Contact : <code>dsvabuse&#64;calixteair.fr</code>
      </p>

      <h2>Directeur de publication</h2>
      <p>
        L'éditeur lui-même.
      </p>

      <h2>Hébergeur</h2>
      <p>
        Hostinger International Ltd. — VPS situé en Europe.<br />
        IP : <code>185.166.39.153</code><br />
        Contact : via le panneau client Hostinger
        (<a href="https://www.hostinger.com" target="_blank" rel="noopener">hostinger.com</a>).
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
        <li>Icônes : <a href="https://lucide.dev" target="_blank" rel="noopener">Lucide</a>.</li>
        <li>Polices : Inter et JetBrains Mono (Google Fonts).</li>
        <li>Frameworks : Angular 21, Symfony 8.</li>
      </ul>
    </app-legal-shell>
  `,
})
export class LegalNoticeComponent {}
