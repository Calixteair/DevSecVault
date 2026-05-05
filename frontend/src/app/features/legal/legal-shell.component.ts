import { Component, OnInit, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../layout/footer/footer.component';
import { SeoService } from '../../core/services/seo.service';

/**
 * Visual shell shared by every /legal/* page. Centers the content inside a
 * readable column, applies the "prose" rhythm (font sizes, spacing, list
 * styling) and renders a draft warning banner when `draft` is true.
 *
 * Each legal page wraps its body in <app-legal-shell title="…">…</app-legal-shell>
 * and writes plain HTML inside (h2, p, ul, etc.). Keeping the typography and
 * background here means the four pages stay identical visually and only their
 * editorial content needs to change.
 */
@Component({
  selector: 'app-legal-shell',
  standalone: true,
  imports: [RouterLink, FooterComponent],
  template: `
    <div class="legal-shell">
      <div class="legal-page">
        <a class="legal-back" routerLink="/dashboard">← Retour à l'accueil</a>
        <article class="prose">
          <header class="prose-header">
            <p class="prose-eyebrow font-mono">[LÉGAL]</p>
            <h1>{{ title() }}</h1>
            @if (draft()) {
              <p class="prose-draft">
                Brouillon — à faire relire par un juriste avant ouverture publique.
              </p>
            }
          </header>
          <ng-content />
        </article>
      </div>
      <app-footer />
    </div>
  `,
  styles: [`
    .legal-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--background);
    }
    .legal-page {
      flex: 1;
      width: 100%;
      max-width: 48rem;
      margin: 0 auto;
      padding: 2rem 1.25rem 3rem;
      color: var(--foreground);
    }
    .legal-back {
      display: inline-block;
      margin-bottom: 1.5rem;
      font-size: 0.8125rem;
      color: var(--muted-foreground);
      text-decoration: none;
      padding: 0.375rem 0.625rem;
      border-radius: var(--radius);
      transition: background-color 0.12s, color 0.12s;
    }
    .legal-back:hover { color: var(--foreground); background: var(--secondary); }

    .prose {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-size: 0.9375rem;
      line-height: 1.65;
      color: var(--foreground);
    }
    .prose-header {
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border);
    }
    .prose-eyebrow {
      font-size: 0.6875rem;
      letter-spacing: 0.12em;
      font-weight: 600;
      color: var(--muted-foreground);
      text-transform: uppercase;
      margin: 0 0 0.5rem;
    }
    .prose ::ng-deep h1,
    .prose-header h1 {
      font-size: 1.625rem;
      font-weight: 700;
      margin: 0 0 0.5rem;
      letter-spacing: -0.01em;
      color: var(--foreground);
    }
    .prose-draft {
      margin: 1rem 0 0;
      padding: 0.625rem 0.875rem;
      background: color-mix(in srgb, var(--accent) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
      color: var(--accent);
      border-radius: var(--radius);
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .prose ::ng-deep h2 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 2rem 0 0.75rem;
      letter-spacing: -0.005em;
      color: var(--foreground);
    }
    .prose ::ng-deep h2:first-child { margin-top: 0; }

    .prose ::ng-deep h3 {
      font-size: 1rem;
      font-weight: 600;
      margin: 1.5rem 0 0.5rem;
      color: var(--foreground);
    }

    .prose ::ng-deep p {
      margin: 0 0 1rem;
      color: var(--foreground);
    }
    .prose ::ng-deep p:last-child { margin-bottom: 0; }

    .prose ::ng-deep ul,
    .prose ::ng-deep ol {
      margin: 0 0 1rem 1.25rem;
      padding: 0;
      color: var(--foreground);
    }
    .prose ::ng-deep li { margin-bottom: 0.375rem; }
    .prose ::ng-deep li:last-child { margin-bottom: 0; }

    .prose ::ng-deep a {
      color: var(--primary);
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .prose ::ng-deep a:hover { text-decoration: none; }

    .prose ::ng-deep code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85em;
      padding: 0.125rem 0.3125rem;
      background: var(--secondary);
      border-radius: 0.25rem;
      color: var(--foreground);
    }

    .prose ::ng-deep strong { font-weight: 600; color: var(--foreground); }
    .prose ::ng-deep em { font-style: italic; color: var(--muted-foreground); }

    @media (max-width: 640px) {
      .legal-page { padding: 1rem 0 2.5rem; }
      .prose { font-size: 0.875rem; }
      .prose-header h1 { font-size: 1.375rem; }
      .prose ::ng-deep h2 { font-size: 1rem; }
    }
  `],
})
export class LegalShellComponent {
  private readonly seo = inject(SeoService);

  readonly title = input.required<string>();
  readonly draft = input<boolean>(true);
  readonly description = input<string | undefined>();

  constructor() {
    effect(() => {
      this.seo.apply({
        title: this.title(),
        description: this.description(),
      });
    });
  }
}
