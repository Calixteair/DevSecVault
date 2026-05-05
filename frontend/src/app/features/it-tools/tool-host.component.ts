import { Component, Type, ViewContainerRef, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { findTool } from './tools.catalog';
import { SeoService } from '../../core/services/seo.service';

/**
 * Route component for /it-tools/:slug.
 *
 * Reads the slug from the URL, looks it up in the tool catalog, and dynamically
 * loads the matching component into a ViewContainerRef. This lets each tool be
 * a regular standalone component without knowing anything about routing.
 *
 * If the slug is unknown, redirects back to the grid.
 */
@Component({
  selector: 'app-tool-host',
  template: `
    @if (loading()) {
      <p class="loading">Loading tool...</p>
    }
    <ng-container #slot></ng-container>
  `,
  styles: [`
    .loading {
      padding: 2rem;
      text-align: center;
      color: var(--muted-foreground);
      font-size: 0.875rem;
    }
  `],
})
export class ToolHostComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly slot = viewChild.required('slot', { read: ViewContainerRef });

  readonly loading = signal(true);

  constructor() {
    // Track slug changes so sidebar-to-tool navigation swaps components cleanly.
    this.route.paramMap.subscribe(async params => {
      const slug = params.get('slug') ?? '';
      const def = findTool(slug);
      if (!def) {
        this.router.navigate(['/it-tools']);
        return;
      }
      this.seo.apply({
        title: `${def.title} — IT Tools`,
        description: `${def.description} Outil 100 % côté navigateur, aucune donnée n'est envoyée au serveur.`,
        path: `/it-tools/${slug}`,
      });
      this.loading.set(true);
      const component = await def.load();
      const vc = this.slot();
      vc.clear();
      vc.createComponent(component as Type<unknown>);
      this.loading.set(false);
    });
  }
}
