import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  Shield,
  Code2,
  Wrench,
  Send,
  Hammer,
  Lock,
  EyeOff,
  ServerCog,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  Github,
} from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { SeoService } from '../../core/services/seo.service';
import { FooterComponent } from '../../layout/footer/footer.component';

const icons = {
  Shield, Code2, Wrench, Send, Hammer, Lock, EyeOff, ServerCog,
  CheckCircle2, ArrowRight, ChevronDown, Github,
};

interface Faq {
  q: string;
  a: string;
}

const FAQ_ITEMS: Faq[] = [
  {
    q: 'DevSecVault est-il open source ?',
    a: "Le code source du projet est publié sur GitHub sous licence permissive. La plateforme est exploitée à titre individuel, non commercial, par un particulier en France.",
  },
  {
    q: 'Mes secrets partagés sont-ils vraiment chiffrés de bout en bout ?',
    a: "Oui. Les liens Secure Bridge utilisent AES-256-GCM côté navigateur via Web Crypto API. La clé est dans le fragment de l'URL (#key) qui n'est jamais envoyé au serveur. Le serveur ne stocke que le ciphertext et la métadonnée d'expiration.",
  },
  {
    q: 'Pourquoi ne pas utiliser Google reCAPTCHA ou hCaptcha ?',
    a: "Pour rester RGPD-friendly. La protection anti-bot du formulaire d'inscription utilise Altcha, un mécanisme de proof-of-work auto-hébergé sans cookie ni appel externe.",
  },
  {
    q: "Quel est le modèle économique ? Vais-je payer un jour ?",
    a: "Non. DevSecVault est non commercial. Les dons via PayPal sont libres et facultatifs, et couvrent uniquement les frais d'infrastructure (VPS, domaine, certificats).",
  },
  {
    q: "Quelle est la politique de modération ?",
    a: "Modération a posteriori après signalement, sous 24 h ouvrées. Tout contenu manifestement illicite (malware ciblé, phishing, contenu terroriste, atteinte aux mineurs) est retiré et le compte sanctionné.",
  },
  {
    q: 'Que se passe-t-il si je supprime mon compte ?',
    a: "La suppression depuis votre page Profil est immédiate et irréversible : tous vos contenus (publics, privés, partagés en équipe), votre coffre-fort, vos liens Secure Bridge et vos jetons d'accès sont effacés. Aucune période de rétention n'est appliquée.",
  },
];

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [LucideAngularModule, RouterLink, FooterComponent],
  providers: [{ provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) }],
  template: `
    <div class="landing">
      <header class="hero">
        <nav class="hero-nav">
          <a routerLink="/" class="nav-logo">
            <span class="logo-mark">D</span>
            <span class="logo-text">DevSecVault</span>
          </a>
          <div class="nav-actions">
            @if (isAuthenticated()) {
              <a routerLink="/dashboard" class="btn btn-primary">
                Mon Dashboard
                <lucide-icon name="arrow-right" [size]="16" [strokeWidth]="2.25"></lucide-icon>
              </a>
            } @else {
              <button type="button" class="btn btn-ghost" (click)="login()">Se connecter</button>
              <button type="button" class="btn btn-primary" (click)="login()">
                Créer un compte
                <lucide-icon name="arrow-right" [size]="16" [strokeWidth]="2.25"></lucide-icon>
              </button>
            }
          </div>
        </nav>

        <div class="hero-content">
          <p class="hero-eyebrow font-mono">[ CYBERSEC · OPEN · SELF-HOSTED ]</p>
          <h1 class="hero-title">
            Le coffre-fort cybersec<br>
            <span class="hero-title-accent">auto-hébergé</span>
          </h1>
          <p class="hero-pitch">
            Snippets multi-langages, payloads chiffrés AES-256, partage de secrets
            E2E, IT Tools 100 % côté navigateur.
            <strong>Aucun cookie tiers, zéro tracking, données hébergées en France.</strong>
          </p>
          <div class="hero-cta">
            @if (isAuthenticated()) {
              <a routerLink="/dev-library" class="btn btn-primary btn-lg">
                Explorer la bibliothèque
                <lucide-icon name="arrow-right" [size]="18" [strokeWidth]="2.25"></lucide-icon>
              </a>
            } @else {
              <button type="button" class="btn btn-primary btn-lg" (click)="login()">
                Créer un compte
                <lucide-icon name="arrow-right" [size]="18" [strokeWidth]="2.25"></lucide-icon>
              </button>
            }
            <a routerLink="/it-tools" class="btn btn-ghost btn-lg">
              Voir les IT Tools
            </a>
          </div>
          <ul class="hero-bullets font-mono">
            <li><lucide-icon name="check-circle-2" [size]="14" [strokeWidth]="2.5" class="bullet-icon"></lucide-icon>RGPD by design</li>
            <li><lucide-icon name="check-circle-2" [size]="14" [strokeWidth]="2.5" class="bullet-icon"></lucide-icon>Suppression compte immédiate</li>
            <li><lucide-icon name="check-circle-2" [size]="14" [strokeWidth]="2.5" class="bullet-icon"></lucide-icon>Sources sur GitHub</li>
          </ul>
        </div>
      </header>

      <section class="features" id="features" aria-labelledby="features-title">
        <div class="section-head">
          <p class="section-eyebrow font-mono">[ MODULES ]</p>
          <h2 id="features-title" class="section-title">Quatre modules, une même philosophie</h2>
          <p class="section-sub">
            Tout est public, signalable et chiffré là où ça compte.
          </p>
        </div>
        <div class="feature-grid">
          <article class="feature">
            <div class="feature-icon icon-primary">
              <lucide-icon name="code-2" [size]="20" [strokeWidth]="2"></lucide-icon>
            </div>
            <h3>Dev Library</h3>
            <p>Bibliothèque de concepts (tri fusion, JWT, exploit pattern) avec un snippet par langage. Templating <code>{{ '\{\{VAR\}\}' }}</code> remplacé côté client à la copie.</p>
            <a routerLink="/dev-library" class="feature-cta">Explorer →</a>
          </article>
          <article class="feature">
            <div class="feature-icon icon-accent">
              <lucide-icon name="wrench" [size]="20" [strokeWidth]="2"></lucide-icon>
            </div>
            <h3>Cyber Toolbox</h3>
            <p>Payloads et scripts pentest chiffrés AES-256-GCM en base, indexés par catégorie (Recon / Exploitation / Privesc) et tags. Générateurs de commandes Nmap, MSFVenom intégrés.</p>
            <a routerLink="/cyber-toolbox" class="feature-cta">Parcourir →</a>
          </article>
          <article class="feature">
            <div class="feature-icon icon-destructive">
              <lucide-icon name="send" [size]="20" [strokeWidth]="2"></lucide-icon>
            </div>
            <h3>Secure Bridge</h3>
            <p>Partage de secrets E2E. Clé AES-256-GCM générée localement, jamais envoyée au serveur. Option <em>burn after read</em>, expiration 10 minutes maximum.</p>
            <a class="feature-cta" (click)="loginIfGuest('/secure-bridge')">Envoyer un secret →</a>
          </article>
          <article class="feature">
            <div class="feature-icon icon-primary">
              <lucide-icon name="hammer" [size]="20" [strokeWidth]="2"></lucide-icon>
            </div>
            <h3>IT Tools</h3>
            <p>Encodage, conversion, calcul de sous-réseau, formatage JSON / YAML, hash. Tout tourne dans votre navigateur, zéro requête réseau.</p>
            <a routerLink="/it-tools" class="feature-cta">Tous les outils →</a>
          </article>
        </div>
      </section>

      <section class="trust" aria-labelledby="trust-title">
        <div class="section-head">
          <p class="section-eyebrow font-mono">[ POURQUOI ]</p>
          <h2 id="trust-title" class="section-title">Conçu pour ceux qui lisent la politique de confidentialité</h2>
        </div>
        <div class="trust-grid">
          <div class="trust-item">
            <lucide-icon name="lock" [size]="22" [strokeWidth]="2" class="trust-icon"></lucide-icon>
            <h3>Chiffrement où il faut</h3>
            <p>Payloads chiffrés AES-256-GCM serveur. Liens Secure Bridge chiffrés bout-en-bout via Web Crypto API. Clés jamais transmises au serveur.</p>
          </div>
          <div class="trust-item">
            <lucide-icon name="eye-off" [size]="22" [strokeWidth]="2" class="trust-icon"></lucide-icon>
            <h3>Sans tracking</h3>
            <p>Pas de Google Analytics, pas de Matomo, pas de Sentry, pas de cookie tiers. Polices auto-hébergées. Anti-bot Altcha en proof-of-work.</p>
          </div>
          <div class="trust-item">
            <lucide-icon name="server-cog" [size]="22" [strokeWidth]="2" class="trust-icon"></lucide-icon>
            <h3>Hébergement français</h3>
            <p>VPS Hostinger, datacenter France. Aucun CDN ni anti-DDoS tiers. Aucun transfert hors UE depuis nos serveurs.</p>
          </div>
          <div class="trust-item">
            <lucide-icon name="shield" [size]="22" [strokeWidth]="2" class="trust-icon"></lucide-icon>
            <h3>RGPD strict</h3>
            <p>Suppression de compte immédiate et irréversible depuis votre page Profil. Pages légales détaillées et alignées sur le code en prod.</p>
          </div>
        </div>
      </section>

      <section class="faq" id="faq" aria-labelledby="faq-title">
        <div class="section-head">
          <p class="section-eyebrow font-mono">[ FAQ ]</p>
          <h2 id="faq-title" class="section-title">Questions fréquentes</h2>
        </div>
        <div class="faq-list">
          @for (item of faq; track item.q; let i = $index) {
            <details class="faq-item" [attr.open]="i === 0 ? '' : null">
              <summary>
                {{ item.q }}
                <lucide-icon name="chevron-down" [size]="18" [strokeWidth]="2" class="faq-chevron"></lucide-icon>
              </summary>
              <p>{{ item.a }}</p>
            </details>
          }
        </div>
      </section>

      <section class="cta-final" aria-label="Créer un compte">
        <h2 class="cta-title">Prêt à essayer ?</h2>
        <p class="cta-sub">Inscription en 30 secondes. Vous pouvez tout supprimer en un clic.</p>
        <div class="cta-buttons">
          @if (isAuthenticated()) {
            <a routerLink="/dashboard" class="btn btn-primary btn-lg">
              Aller à mon Dashboard
              <lucide-icon name="arrow-right" [size]="18" [strokeWidth]="2.25"></lucide-icon>
            </a>
          } @else {
            <button type="button" class="btn btn-primary btn-lg" (click)="login()">
              Créer un compte
              <lucide-icon name="arrow-right" [size]="18" [strokeWidth]="2.25"></lucide-icon>
            </button>
            <button type="button" class="btn btn-ghost btn-lg" (click)="login()">Se connecter</button>
          }
        </div>
      </section>

      <app-footer />
    </div>

    <script type="application/ld+json" [innerHTML]="faqJsonLd()"></script>
  `,
  styles: [`
    :host { display: block; background: var(--background); color: var(--foreground); }
    .landing {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
    }

    /* Hero */
    .hero {
      position: relative;
      padding: 1.25rem 1.5rem 5rem;
      background:
        radial-gradient(circle at 20% 0%, color-mix(in srgb, var(--primary) 12%, transparent), transparent 55%),
        radial-gradient(circle at 80% 30%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 55%),
        var(--background);
      overflow: hidden;
    }
    .hero-nav {
      max-width: 72rem;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 0;
    }
    .nav-logo {
      display: inline-flex;
      align-items: center;
      gap: 0.625rem;
      text-decoration: none;
      color: var(--foreground);
    }
    .logo-mark {
      width: 1.875rem;
      height: 1.875rem;
      border-radius: calc(var(--radius) - 2px);
      background: var(--primary);
      color: var(--primary-foreground);
      display: grid;
      place-items: center;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      font-size: 0.95rem;
    }
    .logo-text { font-weight: 600; letter-spacing: -0.01em; }
    .nav-actions { display: flex; gap: 0.5rem; align-items: center; }

    .hero-content {
      max-width: 60rem;
      margin: 5rem auto 0;
      text-align: center;
    }
    .hero-eyebrow {
      display: inline-block;
      font-size: 0.75rem;
      letter-spacing: 0.18em;
      color: var(--primary);
      margin-bottom: 1.5rem;
      padding: 0.375rem 0.75rem;
      border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
      border-radius: 999px;
      background: color-mix(in srgb, var(--primary) 8%, transparent);
    }
    .hero-title {
      font-size: clamp(2.25rem, 6vw, 4.25rem);
      font-weight: 800;
      letter-spacing: -0.025em;
      line-height: 1.05;
      margin-bottom: 1.5rem;
      color: var(--foreground);
    }
    .hero-title-accent {
      background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, var(--accent)));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .hero-pitch {
      font-size: clamp(1rem, 1.6vw, 1.125rem);
      max-width: 38rem;
      margin: 0 auto 2rem;
      color: var(--muted-foreground);
      line-height: 1.6;
    }
    .hero-pitch strong { color: var(--foreground); font-weight: 600; }
    .hero-cta {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
      flex-wrap: wrap;
      margin-bottom: 2.5rem;
    }
    .hero-bullets {
      display: inline-flex;
      gap: 1.5rem;
      flex-wrap: wrap;
      justify-content: center;
      list-style: none;
      padding: 0;
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }
    .hero-bullets li { display: inline-flex; align-items: center; gap: 0.375rem; }
    .bullet-icon { color: var(--primary); }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border: 1px solid transparent;
      border-radius: var(--radius);
      font-size: 0.875rem;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      transition: filter 0.12s, background-color 0.12s, border-color 0.12s;
      white-space: nowrap;
      font-family: inherit;
    }
    .btn-lg { padding: 0.75rem 1.25rem; font-size: 0.9375rem; font-weight: 600; }
    .btn-primary {
      background: var(--primary);
      color: var(--primary-foreground);
      border-color: var(--primary);
    }
    .btn-primary:hover { filter: brightness(1.08); }
    .btn-ghost {
      background: transparent;
      color: var(--foreground);
      border-color: var(--border);
    }
    .btn-ghost:hover { background: var(--secondary); }

    /* Sections shared */
    .features, .trust, .faq, .cta-final {
      padding: 5rem 1.5rem;
      max-width: 72rem;
      margin: 0 auto;
      width: 100%;
    }
    .section-head { text-align: center; margin-bottom: 3rem; }
    .section-eyebrow {
      font-size: 0.6875rem;
      letter-spacing: 0.18em;
      color: var(--muted-foreground);
      margin-bottom: 0.75rem;
    }
    .section-title {
      font-size: clamp(1.625rem, 3.4vw, 2.25rem);
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 0.75rem;
      color: var(--foreground);
    }
    .section-sub { color: var(--muted-foreground); font-size: 1rem; }

    /* Features grid */
    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
    }
    .feature {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      transition: border-color 0.15s, transform 0.15s;
    }
    .feature:hover { border-color: color-mix(in srgb, var(--primary) 35%, var(--border)); transform: translateY(-2px); }
    .feature-icon {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: calc(var(--radius) - 2px);
      display: grid;
      place-items: center;
      margin-bottom: 0.875rem;
    }
    .icon-primary { background: color-mix(in srgb, var(--primary) 15%, transparent); color: var(--primary); }
    .icon-accent { background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent); }
    .icon-destructive { background: color-mix(in srgb, var(--destructive) 15%, transparent); color: var(--destructive); }
    .feature h3 {
      font-size: 1.0625rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: var(--foreground);
    }
    .feature p { font-size: 0.8125rem; color: var(--muted-foreground); line-height: 1.55; flex: 1; margin-bottom: 1rem; }
    .feature p code {
      font-family: 'JetBrains Mono', monospace;
      background: var(--secondary);
      padding: 0.0625rem 0.25rem;
      border-radius: 3px;
      font-size: 0.85em;
    }
    .feature-cta {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--primary);
      text-decoration: none;
      cursor: pointer;
    }
    .feature-cta:hover { text-decoration: underline; }

    /* Trust grid */
    .trust-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }
    .trust-item {
      padding: 1.25rem;
      border-left: 2px solid var(--primary);
      background: color-mix(in srgb, var(--card) 50%, transparent);
    }
    .trust-icon { color: var(--primary); margin-bottom: 0.625rem; }
    .trust-item h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.375rem; color: var(--foreground); }
    .trust-item p { font-size: 0.8125rem; color: var(--muted-foreground); line-height: 1.55; }

    /* FAQ */
    .faq-list { max-width: 48rem; margin: 0 auto; display: flex; flex-direction: column; gap: 0.5rem; }
    .faq-item {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0;
      overflow: hidden;
    }
    .faq-item summary {
      cursor: pointer;
      list-style: none;
      padding: 1rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      font-weight: 500;
      font-size: 0.9375rem;
      color: var(--foreground);
    }
    .faq-item summary::-webkit-details-marker { display: none; }
    .faq-chevron {
      color: var(--muted-foreground);
      transition: transform 0.2s;
      flex-shrink: 0;
    }
    .faq-item[open] .faq-chevron { transform: rotate(180deg); }
    .faq-item p {
      padding: 0 1.25rem 1.25rem;
      color: var(--muted-foreground);
      font-size: 0.875rem;
      line-height: 1.6;
    }

    /* Final CTA */
    .cta-final {
      text-align: center;
      padding-top: 4rem;
      padding-bottom: 4rem;
    }
    .cta-title { font-size: clamp(1.625rem, 3vw, 2rem); font-weight: 700; margin-bottom: 0.625rem; color: var(--foreground); }
    .cta-sub { color: var(--muted-foreground); margin-bottom: 1.75rem; }
    .cta-buttons { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }

    @media (max-width: 640px) {
      .hero { padding: 1rem 1rem 3rem; }
      .hero-content { margin-top: 3rem; }
      .features, .trust, .faq, .cta-final { padding: 3rem 1rem; }
    }
  `],
})
export class LandingComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  private readonly doc = inject(DOCUMENT);

  readonly isAuthenticated = toSignal(this.auth.isAuthenticated$, { initialValue: false });
  readonly faq = FAQ_ITEMS;

  readonly faqJsonLd = computed(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: this.faq.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }));

  ngOnInit(): void {
    this.seo.apply({
      title: 'Coffre-fort cybersec auto-hébergé',
      description: 'DevSecVault : bibliothèque de snippets cybersec, payloads chiffrés AES-256, partage de secrets E2E, IT Tools 100 % côté navigateur. RGPD-friendly, hébergé en France, sans tracking.',
      path: '/',
    });
  }

  login(): void {
    this.auth.login('/dashboard');
  }

  loginIfGuest(target: string): void {
    if (this.isAuthenticated()) {
      this.doc.location.assign(target);
    } else {
      this.auth.login(target);
    }
  }
}
