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
          <strong>Empreinte cryptographique de l'adresse IP</strong>
          (pseudonymisation par hachage SHA-256) stockée avec les
          signalements, à des fins de lutte contre les abus. Cette
          empreinte ne constitue pas une anonymisation au sens du RGPD :
          une IPv4 reste théoriquement reconstructible par recherche
          exhaustive et est donc traitée comme une donnée à caractère
          personnel.
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
          <strong>Données de don</strong> : si vous effectuez un don via
          PayPal, les données de paiement sont collectées et conservées par
          PayPal (Europe) S.à r.l. et Cie, S.C.A. selon ses propres
          conditions (<a href="https://www.paypal.com/fr/legalhub/privacy-full" target="_blank" rel="noopener">paypal.com/fr/legalhub</a>).
          DevSecVault ne reçoit qu'un montant et un identifiant de
          transaction.
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
          des logs (art. 6-II LCEN).
        </li>
        <li>
          <strong>Intérêt légitime</strong> (art. 6.1.f RGPD) pour la lutte
          contre les abus (rate-limiting, hachage d'IP sur signalements).
        </li>
      </ul>

      <h2>4. Conservation</h2>
      <ul>
        <li><strong>Compte utilisateur</strong> : aussi longtemps que le
          compte est actif. La suppression se fait sur demande à
          <code>dsvabuse&#64;calixteair.fr</code> et est effective sous
          30 jours (les contenus publics sont anonymisés ; les contenus
          privés sont supprimés).</li>
        <li><strong>Signalements (reports)</strong> : 1 an à compter de la
          décision de modération, à des fins de preuve (LCEN, DSA).</li>
        <li><strong>Données de connexion (logs Nginx, Keycloak)</strong> :
          1 an à compter de leur création, conformément à l'article 6-II
          de la LCEN et au décret n° 2021-1363.</li>
        <li><strong>Logs applicatifs Symfony</strong> (erreurs, audit) :
          90 jours.</li>
        <li><strong>Liens Secure Bridge</strong> : automatiquement détruits
          au plus tard 10 minutes après leur création.</li>
        <li><strong>Tokens d'accès personnels (PAT)</strong> : selon
          l'expiration choisie par l'utilisateur ; purgés 30 jours après
          expiration.</li>
        <li><strong>Données de don (PayPal)</strong> : montant et identifiant
          de transaction conservés 10 ans pour répondre aux obligations
          comptables et fiscales.</li>
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
        requête vers Google Fonts n'est effectuée.
      </p>

      <h2>8. Sous-traitants et hébergement</h2>
      <ul>
        <li>
          <strong>Hostinger International Ltd.</strong> (Chypre / UE) —
          hébergeur du VPS qui exécute l'ensemble du service.
        </li>
        <li>
          <strong>PayPal (Europe) S.à r.l. et Cie, S.C.A.</strong>
          (Luxembourg / UE) — traitement des dons (le cas échéant).
        </li>
        <li>
          <strong>Hostinger SMTP</strong> — relais e-mail sortant pour les
          notifications de modération.
        </li>
      </ul>
      <p>
        Les données utilisateur sont hébergées en Union européenne. Certains
        sous-traitants peuvent recourir à des prestataires hors UE pour des
        opérations techniques (CDN, anti-DDoS) ; dans ce cas, ces transferts
        sont encadrés par les clauses contractuelles types de la Commission
        européenne.
      </p>
    </app-legal-shell>
  `,
})
export class LegalPrivacyComponent {}
