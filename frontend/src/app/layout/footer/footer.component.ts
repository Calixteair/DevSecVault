import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Global footer with links to legal pages. Mounted in the main layout so it
 * shows below every authenticated/guest page; also included in fully public
 * pages (login, secret viewer, invite landing) to remain reachable from any
 * entry point — DSA / LCEN expect those notices to be one click away.
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="app-footer">
      <nav class="footer-links" aria-label="Liens légaux">
        <a routerLink="/legal/terms" class="footer-link">CGU</a>
        <span class="footer-sep" aria-hidden="true">·</span>
        <a routerLink="/legal/privacy" class="footer-link">Confidentialité</a>
        <span class="footer-sep" aria-hidden="true">·</span>
        <a routerLink="/legal/notice" class="footer-link">Mentions légales</a>
        <span class="footer-sep" aria-hidden="true">·</span>
        <a routerLink="/legal/abuse" class="footer-link">Signalement</a>
        <span class="footer-sep" aria-hidden="true">·</span>
        <a routerLink="/support" class="footer-link footer-link-support">Soutenir</a>
      </nav>
    </footer>
  `,
  styles: [`
    .app-footer {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 0.875rem 1rem;
      border-top: 1px solid var(--border);
      background: var(--background);
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }
    .footer-links {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    .footer-link {
      color: var(--muted-foreground);
      text-decoration: none;
      transition: color 0.12s;
      padding: 0.125rem 0.25rem;
      border-radius: 0.25rem;
    }
    .footer-link:hover { color: var(--foreground); }
    .footer-link-support { color: var(--primary); font-weight: 500; }
    .footer-link-support:hover { color: var(--primary); filter: brightness(1.15); }
    .footer-link:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }
    .footer-sep { user-select: none; }

    @media (max-width: 480px) {
      .app-footer { padding: 0.75rem 0.625rem; }
      .footer-links { gap: 0.375rem; font-size: 0.6875rem; }
    }
  `],
})
export class FooterComponent {}
