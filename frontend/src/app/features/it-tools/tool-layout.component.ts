import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider, ArrowLeft } from 'lucide-angular';

/**
 * Shared shell for every IT Tool detail page.
 *
 * Visual language matches the catalog: monospace breadcrumb, editorial
 * title with a punctuated accent, and a max-width rail so tool forms
 * stay legible on wide monitors. Fully responsive under 560px.
 */
@Component({
  selector: 'app-tool-layout',
  imports: [RouterLink, LucideAngularModule],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider({ ArrowLeft }) },
  ],
  template: `
    <div class="tool-page">
      <a routerLink="/it-tools" class="back-link">
        <lucide-icon name="arrow-left" [size]="14" [strokeWidth]="2"></lucide-icon>
        <span>it-tools</span>
        <span class="back-sep">/</span>
        <span class="back-current">{{ title() }}</span>
      </a>
      <header class="tool-header">
        <h1 class="tool-title">{{ title() }}<span class="tool-title-accent">.</span></h1>
        @if (subtitle()) {
          <p class="tool-subtitle">{{ subtitle() }}</p>
        }
      </header>
      <div class="tool-content">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .tool-page {
      padding: 0.5rem 0 3rem;
      max-width: 68rem;
      margin: 0 auto;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      letter-spacing: 0.04em;
      color: var(--muted-foreground);
      text-decoration: none;
      margin-bottom: 1rem;
      transition: color 0.15s ease;
    }
    .back-link:hover { color: var(--foreground); }
    .back-sep { opacity: 0.5; }
    .back-current { color: var(--foreground); }

    .tool-header {
      margin-bottom: 1.75rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid var(--border);
    }
    .tool-title {
      font-size: clamp(1.5rem, 3.5vw, 2rem);
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.1;
      color: var(--foreground);
      margin: 0 0 0.375rem;
    }
    .tool-title-accent { color: var(--primary); }
    .tool-subtitle {
      font-size: 0.9375rem;
      color: var(--muted-foreground);
      margin: 0;
      max-width: 50rem;
      line-height: 1.55;
    }
    .tool-content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    @media (max-width: 560px) {
      .tool-page { padding: 0.25rem 0 2rem; }
      .tool-header { margin-bottom: 1.25rem; padding-bottom: 1rem; }
      .back-link { margin-bottom: 0.75rem; }
      .back-current { display: none; }
      .back-sep { display: none; }
      .tool-subtitle { font-size: 0.875rem; }
      .tool-content { gap: 0.75rem; }
    }
  `],
})
export class ToolLayoutComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}
