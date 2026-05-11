import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="app-footer">
      <span class="footer-sigil font-mono" aria-hidden="true">//</span>
      <nav class="footer-links font-mono" aria-label="Liens légaux">
        <a routerLink="/legal/terms" class="footer-link">terms</a>
        <span class="footer-sep" aria-hidden="true">·</span>
        <a routerLink="/legal/privacy" class="footer-link">privacy</a>
        <span class="footer-sep" aria-hidden="true">·</span>
        <a routerLink="/legal/notice" class="footer-link">legal</a>
        <span class="footer-sep" aria-hidden="true">·</span>
        <a routerLink="/legal/abuse" class="footer-link">abuse</a>
        <span class="footer-sep" aria-hidden="true">·</span>
        <a routerLink="/support" class="footer-link footer-link-support">support</a>
      </nav>
    </footer>
  `,
  styles: [`
    .app-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.625rem;
      padding: 0.875rem 1rem;
      border-top: 1px dashed var(--border);
      background: transparent;
      font-size: 0.625rem;
      color: var(--foreground-subtle);
      letter-spacing: 0.06em;
    }
    .footer-sigil { color: var(--primary); opacity: 0.6; }
    .footer-links {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    .footer-link {
      color: var(--foreground-subtle);
      text-decoration: none;
      transition: color 120ms var(--ease);
      padding: 0.125rem 0.125rem;
    }
    .footer-link:hover { color: var(--foreground); }
    .footer-link-support { color: var(--primary); }
    .footer-link-support:hover { color: var(--primary-hover); }
    .footer-link:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }
    .footer-sep {
      user-select: none;
      color: var(--border-strong);
    }

    @media (max-width: 480px) {
      .app-footer { padding: 0.75rem 0.625rem; gap: 0.5rem; }
      .footer-links { gap: 0.4375rem; font-size: 0.5625rem; }
    }
  `],
})
export class FooterComponent {}
