import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalShellComponent } from './legal-shell.component';

/**
 * /legal/privacy — Politique de confidentialité (RGPD).
 */
@Component({
  selector: 'app-legal-privacy',
  standalone: true,
  imports: [LegalShellComponent, RouterLink],
  template: `
    <app-legal-shell title="Politique de confidentialité">
      <h2>Préambule</h2>
      <p>
        DevSecVault traite des données personnelles dans le respect du
        Règlement général sur la protection des données (RGPD,
        UE 2016/679) et de la loi Informatique et Libertés.
      </p>

      <h2>1. Données collectées</h2>
      <ul>
        <li>
          <strong>Adresse e-mail</strong> (obligatoire, fournie via Keycloak
          lors de l'inscription).
        </li>
        <li>
          <strong>Nom d'utilisateur</strong> (visible publiquement sur les
          contenus que vous publiez en mode <em>public</em> ou <em>team</em>).
        </li>
        <li>
          <strong>Adresse IP hashée</strong> (SHA-256, sans sel public) sur
          les signalements et tentatives d'authentification, à des fins
          anti-abus uniquement.
        </li>
        <li>
          <strong>Contenu créé</strong> par l'utilisateur (snippets,
          payloads, commentaires, tags). Les payloads sont chiffrés en base
          via AES-256.
        </li>
      </ul>

      <h2>2. Finalité du traitement</h2>
      <ul>
        <li>Fournir le service tel qu'il est décrit dans les CGU.</li>
        <li>Lutter contre les abus et la modération de contenus illégaux.</li>
        <li>
          Notifier l'utilisateur des décisions de modération concernant ses
          contenus.
        </li>
      </ul>

      <h2>3. Base légale</h2>
      <p>
        L'<strong>intérêt légitime</strong> de l'éditeur à fournir et
        sécuriser le service ; et le <strong>consentement</strong> de
        l'utilisateur via l'acceptation explicite des CGU à l'inscription.
      </p>

      <h2>4. Conservation</h2>
      <ul>
        <li><strong>Compte utilisateur</strong> : aussi longtemps que le
          compte est actif, puis 30 jours après suppression (purge complète
          au-delà).</li>
        <li><strong>Signalements (reports)</strong> : 1 an.</li>
        <li><strong>Logs serveur (Symfony, Nginx)</strong> : 6 mois maximum.</li>
        <li><strong>Liens Secure Bridge</strong> : automatiquement détruits
          au plus tard 10 minutes après leur création.</li>
      </ul>

      <h2>5. Vos droits RGPD</h2>
      <p>Conformément aux articles 15 à 22 du RGPD, vous disposez :</p>
      <ul>
        <li>D'un <strong>droit d'accès</strong> à vos données.</li>
        <li>D'un <strong>droit de rectification</strong>.</li>
        <li>D'un <strong>droit à l'effacement</strong> (« droit à l'oubli »).</li>
        <li>D'un <strong>droit d'opposition</strong> au traitement.</li>
        <li>D'un <strong>droit à la portabilité</strong> de vos contenus.</li>
        <li>D'un <strong>droit d'introduire une réclamation</strong> auprès
          de la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener">cnil.fr</a>).</li>
      </ul>
      <p>
        Pour exercer ces droits, contactez :
        <code>dsvabuse&#64;calixteair.fr</code>. Une réponse sera apportée
        dans un délai d'un mois.
      </p>

      <h2>6. Délégué à la protection des données</h2>
      <p>
        Le responsable de traitement et le DPO de fait sont l'éditeur du
        service (voir <a routerLink="/legal/notice">mentions légales</a>),
        joignable à <code>dsvabuse&#64;calixteair.fr</code>.
      </p>

      <h2>7. Cookies et traceurs</h2>
      <p>
        DevSecVault n'utilise <strong>aucun cookie tiers</strong> ni outil
        de tracking analytique (Google Analytics, Matomo, etc.). Les seuls
        cookies déposés sont les cookies techniques nécessaires au
        fonctionnement de Keycloak (session OIDC) et au respect du choix de
        thème (clair / sombre).
      </p>

      <h2>8. Sous-traitants et hébergement</h2>
      <p>
        Les données sont hébergées en Europe sur un VPS Hostinger
        (voir <a routerLink="/legal/notice">mentions légales</a>). Aucune
        donnée n'est transférée hors de l'Union européenne.
      </p>
    </app-legal-shell>
  `,
})
export class LegalPrivacyComponent {}
