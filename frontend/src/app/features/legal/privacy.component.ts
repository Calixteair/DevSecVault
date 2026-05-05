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
    <app-legal-shell title="Politique de confidentialité" description="Politique de confidentialité RGPD de DevSecVault : données collectées, finalités, conservation, droits des utilisateurs, hébergement Hostinger France.">
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
          <strong>Empreinte cryptographique de l'adresse IP</strong> du
          déclarant lors d'un signalement (pseudonymisation par HMAC-SHA256
          avec un sel applicatif stocké séparément dans le coffre-fort de
          l'éditeur). Le sel n'est jamais exposé et empêche la
          reconstruction des IP par recherche exhaustive. L'empreinte reste
          néanmoins traitée comme une donnée à caractère personnel au sens
          du RGPD.
        </li>
        <li>
          <strong>Adresse IP en clair</strong> dans les journaux techniques
          du serveur web (Nginx) et de Keycloak, conservée selon le
          calendrier de la section 4 ci-dessous, conformément à
          l'article 6-II de la LCEN.
        </li>
        <li>
          <strong>Contenu créé</strong> par l'utilisateur (concepts,
          snippets, payloads, tags). Les payloads de la Cyber Toolbox sont
          chiffrés en base via AES-256-GCM ; les liens Secure Bridge sont
          chiffrés de bout-en-bout côté navigateur (la clé n'est jamais
          transmise au serveur).
        </li>
        <li>
          <strong>Aucune donnée de paiement ni de don.</strong> Les dons
          éventuels sont gérés intégralement par PayPal sur leur propre
          plateforme (<a href="https://www.paypal.com/fr/legalhub/privacy-full" target="_blank" rel="noopener">paypal.com/fr/legalhub</a>).
          DevSecVault ne reçoit aucune donnée nominative, montant ni
          identifiant de transaction. Le simple clic sur le bouton « Soutenir »
          provoque une redirection vers PayPal, dont le traitement échappe au
          présent service.
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
      <ul>
        <li>
          <strong>Exécution du contrat</strong> (art. 6.1.b RGPD) pour la
          gestion du compte, l'authentification et la fourniture du service.
        </li>
        <li>
          <strong>Obligation légale</strong> (art. 6.1.c RGPD) pour la
          modération des contenus illicites (LCEN, DSA) et la conservation
          des logs (art. 6-II LCEN, décret n° 2021-1363).
        </li>
        <li>
          <strong>Intérêt légitime</strong> (art. 6.1.f RGPD) pour la lutte
          contre les abus (rate-limiting, hachage d'IP sur signalements).
        </li>
      </ul>

      <h2>4. Conservation</h2>
      <ul>
        <li>
          <strong>Compte utilisateur</strong> : aussi longtemps que le compte
          est actif. Vous pouvez le supprimer à tout moment depuis votre
          page Profil. La <strong>suppression est immédiate et
          irréversible</strong> : tous vos contenus (publics, privés,
          partagés en équipe) sont effacés, ainsi que vos liens Secure
          Bridge, votre coffre-fort personnel, vos jetons d'accès et vos
          adhésions d'équipe. Aucune période de rétention ni d'anonymisation
          n'est appliquée à vos contenus.
        </li>
        <li>
          <strong>Signalements (reports)</strong> : 1 an à compter de la
          décision de modération, à des fins de preuve (LCEN, DSA). Purge
          automatique au-delà.
        </li>
        <li>
          <strong>Données de connexion (logs Nginx, Keycloak)</strong> :
          1 an à compter de leur création, conformément à l'article 6-II
          de la LCEN et au décret n° 2021-1363. La rotation est assurée
          au niveau du moteur de conteneurs (Docker) avec des limites de
          taille calibrées pour couvrir cette durée au regard du trafic
          observé.
        </li>
        <li>
          <strong>Liens Secure Bridge</strong> : automatiquement détruits
          au plus tard 10 minutes après leur création.
        </li>
        <li>
          <strong>Tokens d'accès personnels (PAT)</strong> : selon
          l'expiration choisie par l'utilisateur ; purgés automatiquement
          30 jours après expiration.
        </li>
      </ul>

      <h2>5. Vos droits RGPD</h2>
      <p>Conformément aux articles 15 à 22 du RGPD, vous disposez :</p>
      <ul>
        <li>D'un <strong>droit d'accès</strong> à vos données.</li>
        <li>D'un <strong>droit de rectification</strong>.</li>
        <li>D'un <strong>droit à l'effacement</strong> (« droit à l'oubli »),
          exerçable directement et sans intermédiaire depuis votre page
          Profil.</li>
        <li>D'un <strong>droit d'opposition</strong> au traitement.</li>
        <li>D'un <strong>droit à la portabilité</strong> de vos contenus.</li>
        <li>D'un <strong>droit d'introduire une réclamation</strong> auprès
          de la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener">cnil.fr</a>).</li>
      </ul>
      <p>
        Pour exercer ces droits autrement que par la suppression
        libre-service de votre compte, contactez :
        <code>dsvabuse&#64;calixteair.fr</code>. Une réponse sera apportée
        dans un délai d'un mois.
      </p>

      <h2>6. Responsable du traitement</h2>
      <p>
        Le responsable du traitement est l'éditeur du service (voir
        <a routerLink="/legal/notice">mentions légales</a>), joignable à
        <code>dsvabuse&#64;calixteair.fr</code>.
      </p>
      <p>
        DevSecVault est exploité à titre individuel et le traitement n'a pas
        un caractère « à grande échelle » au sens de l'article 37 du RGPD ;
        en conséquence, <strong>aucun délégué à la protection des données
        (DPO) n'a été désigné</strong>. Toute question relative à la
        protection de vos données peut néanmoins être adressée à l'adresse
        ci-dessus.
      </p>

      <h2>7. Cookies, traceurs et stockage local</h2>
      <p>
        DevSecVault n'utilise <strong>aucun cookie tiers</strong> ni outil
        de tracking analytique (Google Analytics, Matomo, etc.). Les seuls
        éléments stockés côté navigateur sont :
      </p>
      <ul>
        <li>
          Les <strong>cookies de session OIDC</strong> déposés par Keycloak
          (cookies techniques exemptés de consentement, art. 82
          loi Informatique et Libertés).
        </li>
        <li>
          Le <strong>choix de thème</strong> (clair / sombre) en
          <code>localStorage</code>.
        </li>
        <li>
          Les <strong>jetons OIDC</strong> (access / refresh) en
          <code>sessionStorage</code> ou <code>localStorage</code> selon
          le mode de persistance choisi par Keycloak.
        </li>
      </ul>
      <p>
        Les polices Inter et JetBrains Mono sont auto-hébergées : aucune
        requête vers Google Fonts n'est effectuée. La protection
        anti-bot du formulaire d'inscription utilise
        <a href="https://altcha.org" target="_blank" rel="noopener">Altcha</a>,
        un mécanisme de proof-of-work auto-hébergé sans cookie ni appel
        externe.
      </p>

      <h2>8. Sous-traitants et hébergement</h2>
      <ul>
        <li>
          <strong>Hostinger International Ltd.</strong> — hébergement du VPS
          qui exécute l'ensemble du service, datacenter situé en
          <strong>France</strong>.
        </li>
        <li>
          <strong>PayPal (Europe) S.à r.l. et Cie, S.C.A.</strong>
          (Luxembourg) — traitement éventuel d'un don, exclusivement sur
          son propre site. PayPal peut, à ses propres conditions, transférer
          vos données vers PayPal Inc. (États-Unis) ; ce transfert est
          encadré par les clauses contractuelles types de la Commission
          européenne. DevSecVault n'est pas partie à ce traitement.
        </li>
      </ul>
      <p>
        Les données utilisateur sont hébergées <strong>en Union européenne
        (France)</strong>. DevSecVault ne fait appel à aucun CDN ni
        anti-DDoS tiers, et n'effectue aucun transfert hors UE depuis ses
        propres serveurs.
      </p>
    </app-legal-shell>
  `,
})
export class LegalPrivacyComponent {}
