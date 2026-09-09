import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import * as Lucide from 'lucide-angular';
import { CATEGORIES, TOOLS, ToolCategory } from './tools.catalog';
import { SeoService } from '../../core/services/seo.service';

// Icons needed by this grid view AND by the tool cards.
// Registering them here avoids per-tool providers (all tool cards render here).
const icons = {
  Search: Lucide.Search,
  ArrowUpRight: Lucide.ArrowUpRight,
  // Category icons
  Lock: Lucide.Lock,
  Network: Lucide.Network,
  Braces: Lucide.Braces,
  Code2: Lucide.Code2,
  Shield: Lucide.Shield,
  // Tool icons
  Hash: Lucide.Hash,
  Key: Lucide.Key,
  Binary: Lucide.Binary,
  Ticket: Lucide.Ticket,
  Fingerprint: Lucide.Fingerprint,
  KeyRound: Lucide.KeyRound,
  ShieldCheck: Lucide.ShieldCheck,
  Split: Lucide.Split,
  ArrowRightLeft: Lucide.ArrowRightLeft,
  Radio: Lucide.Radio,
  Link: Lucide.Link,
  Monitor: Lucide.Monitor,
  Calculator: Lucide.Calculator,
  Percent: Lucide.Percent,
  FileCode: Lucide.FileCode,
  Regex: Lucide.Regex,
  Clock: Lucide.Clock,
  FileLock: Lucide.FileLock,
  GitCompare: Lucide.GitCompare,
  BadgeCheck: Lucide.BadgeCheck,
  TriangleAlert: Lucide.TriangleAlert,
};

const CATEGORY_ICONS: Record<ToolCategory, string> = {
  crypto: 'lock',
  network: 'network',
  encoding: 'braces',
  dev: 'code-2',
  cybersec: 'shield',
};

@Component({
  selector: 'app-it-tools',
  imports: [RouterLink, LucideAngularModule],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="kicker">
          <span class="kicker-dot"></span>
          <span>Client-side only — nothing leaves this browser</span>
        </div>
        <h1 class="page-title">IT Tools<span class="page-title-accent">.</span></h1>
        <p class="page-subtitle">
          A curated catalog of {{ totalCount }} utilities for developers and security folks.
          Everything runs locally.
        </p>
      </header>

      <div class="controls">
        <div class="search-wrap">
          <lucide-icon name="search" [size]="16" [strokeWidth]="2" class="search-icon"></lucide-icon>
          <input
            type="text"
            class="search-input"
            placeholder="Search by name, keyword, or slug…"
            [value]="query()"
            (input)="onSearch($event)"
            aria-label="Search tools"
          />
          <kbd class="search-kbd">/</kbd>
        </div>
        <div class="chips" role="tablist" aria-label="Filter by category">
          <button
            type="button"
            class="chip"
            role="tab"
            [attr.aria-selected]="activeCategory() === null"
            [class.chip-active]="activeCategory() === null"
            (click)="setCategory(null)">
            <span class="chip-count">{{ totalCount }}</span>
            All
          </button>
          @for (cat of categories; track cat.id) {
            <button
              type="button"
              class="chip"
              role="tab"
              [class]="'chip cat-' + cat.id"
              [attr.aria-selected]="activeCategory() === cat.id"
              [class.chip-active]="activeCategory() === cat.id"
              (click)="setCategory(cat.id)">
              <span class="chip-count">{{ categoryCount(cat.id) }}</span>
              {{ cat.label }}
            </button>
          }
        </div>
      </div>

      @if (filteredTools().length === 0) {
        <div class="empty">
          <span class="empty-code">// no_match</span>
          <p>No tool matches your search. Try a broader keyword or clear filters.</p>
        </div>
      } @else {
        <div class="grid">
          @for (tool of filteredTools(); track tool.slug; let i = $index) {
            <a class="tool-card" [class]="'cat-' + tool.category" [routerLink]="['/it-tools', tool.slug]">
              <div class="tool-index">{{ pad(i + 1) }}</div>
              <div class="tool-head">
                <div class="tool-icon">
                  <lucide-icon [name]="tool.icon" [size]="18" [strokeWidth]="1.75"></lucide-icon>
                </div>
                <span class="tool-cat">{{ categoryLabel(tool.category) }}</span>
              </div>
              <div class="tool-body">
                <h3 class="tool-title">{{ tool.title }}</h3>
                <p class="tool-desc">{{ tool.description }}</p>
              </div>
              <div class="tool-foot">
                <span class="tool-slug">/{{ tool.slug }}</span>
                <lucide-icon name="arrow-up-right" [size]="14" [strokeWidth]="2" class="tool-arrow"></lucide-icon>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .page {
      padding: 0.5rem 0 3rem;
      max-width: 84rem;
      margin: 0 auto;
    }

    /* ─── Header ───────────────────────────────────────────────────────── */
    .page-header {
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border);
    }
    .kicker {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted-foreground);
      margin-bottom: 1rem;
    }
    .kicker-dot {
      width: 0.4rem;
      height: 0.4rem;
      border-radius: 50%;
      background: var(--primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 25%, transparent);
      animation: pulse 2.4s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .page-title {
      font-size: clamp(1.75rem, 4vw, 2.5rem);
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--foreground);
      margin: 0 0 0.5rem;
      line-height: 1;
    }
    .page-title-accent { color: var(--primary); }
    .page-subtitle {
      font-size: 0.9375rem;
      color: var(--muted-foreground);
      margin: 0;
      max-width: 42rem;
      line-height: 1.55;
    }

    /* ─── Controls ─────────────────────────────────────────────────────── */
    .controls {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1.75rem;
    }
    .search-wrap {
      position: relative;
      max-width: 32rem;
    }
    .search-icon {
      position: absolute;
      left: 0.875rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--muted-foreground);
      pointer-events: none;
    }
    .search-input {
      width: 100%;
      height: 2.625rem;
      padding: 0 2.5rem 0 2.5rem;
      background: var(--input-background);
      border: 1px solid var(--input);
      border-radius: calc(var(--radius) - 2px);
      color: var(--foreground);
      font-size: 0.875rem;
      font-family: 'JetBrains Mono', monospace;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .search-input:focus {
      border-color: var(--ring);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 18%, transparent);
    }
    .search-input::placeholder { color: var(--muted-foreground); }
    .search-kbd {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      padding: 0.125rem 0.4rem;
      background: var(--secondary);
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--muted-foreground);
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      height: 2rem;
      padding: 0 0.875rem;
      border-radius: 9999px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--muted-foreground);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.04em;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .chip-count {
      font-size: 0.625rem;
      opacity: 0.7;
      padding: 0.0625rem 0.375rem;
      background: color-mix(in srgb, currentColor 10%, transparent);
      border-radius: 3px;
    }
    .chip:hover {
      background: var(--secondary);
      color: var(--foreground);
      border-color: var(--muted-foreground);
    }
    .chip-active {
      background: var(--foreground);
      color: var(--background);
      border-color: var(--foreground);
    }
    .chip-active:hover {
      background: var(--foreground);
      color: var(--background);
      border-color: var(--foreground);
    }
    .chip-active .chip-count {
      background: color-mix(in srgb, var(--background) 30%, transparent);
    }

    /* ─── Grid ─────────────────────────────────────────────────────────── */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr));
      gap: 0.875rem;
    }

    /* Card base — the "atelier sheet".
       Signature moves: monospace index number top-left, 3px colored rail
       on the left edge that encodes the category, slug printed at the foot. */
    .tool-card {
      position: relative;
      display: grid;
      grid-template-rows: auto auto 1fr auto;
      gap: 0.75rem;
      padding: 1.125rem 1.125rem 1rem 1.25rem;
      background: var(--card);
      border: 1px solid var(--border);
      border-left: 3px solid var(--border);
      border-radius: calc(var(--radius) - 2px);
      text-decoration: none;
      color: inherit;
      overflow: hidden;
      transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
    }
    .tool-card::before {
      /* Subtle diagonal scanline texture — industrial utility feel */
      content: '';
      position: absolute;
      inset: 0;
      background-image: repeating-linear-gradient(
        135deg,
        transparent 0,
        transparent 8px,
        color-mix(in srgb, var(--foreground) 1.5%, transparent) 8px,
        color-mix(in srgb, var(--foreground) 1.5%, transparent) 9px
      );
      opacity: 0;
      transition: opacity 0.25s ease;
      pointer-events: none;
    }
    .tool-card:hover {
      transform: translateY(-2px);
      border-top-color: var(--muted-foreground);
      border-right-color: var(--muted-foreground);
      border-bottom-color: var(--muted-foreground);
    }
    .tool-card:hover::before { opacity: 1; }
    .tool-card:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }

    /* Category rail color (left border only) */
    .cat-crypto   { border-left-color: var(--accent); }
    .cat-network  { border-left-color: var(--primary); }
    .cat-encoding { border-left-color: var(--chart-3, #0891B2); }
    .cat-dev      { border-left-color: var(--chart-4, #F59E0B); }
    .cat-cybersec { border-left-color: var(--destructive); }

    .tool-index {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: var(--muted-foreground);
    }
    .tool-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .tool-icon {
      width: 2.25rem;
      height: 2.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) - 3px);
      color: var(--foreground);
      background: color-mix(in srgb, var(--secondary) 40%, transparent);
    }
    .cat-crypto   .tool-icon { color: var(--accent); }
    .cat-network  .tool-icon { color: var(--primary); }
    .cat-encoding .tool-icon { color: var(--chart-3, #0891B2); }
    .cat-dev      .tool-icon { color: var(--chart-4, #F59E0B); }
    .cat-cybersec .tool-icon { color: var(--destructive); }

    .tool-cat {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted-foreground);
    }

    .tool-body { min-width: 0; }
    .tool-title {
      margin: 0 0 0.375rem;
      font-size: 1.0625rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--foreground);
      line-height: 1.2;
    }
    .tool-desc {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--muted-foreground);
      line-height: 1.5;
    }

    .tool-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding-top: 0.625rem;
      border-top: 1px dashed var(--border);
    }
    .tool-slug {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.6875rem;
      color: var(--muted-foreground);
      letter-spacing: 0.02em;
    }
    .tool-arrow {
      color: var(--muted-foreground);
      transition: transform 0.2s ease, color 0.2s ease;
    }
    .tool-card:hover .tool-arrow {
      transform: translate(2px, -2px);
      color: var(--foreground);
    }

    /* ─── Empty state ─────────────────────────────────────────────────── */
    .empty {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--muted-foreground);
      border: 1px dashed var(--border);
      border-radius: var(--radius);
    }
    .empty-code {
      display: inline-block;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      color: var(--destructive);
      margin-bottom: 0.5rem;
    }
    .empty p { margin: 0; font-size: 0.875rem; }

    /* ─── Responsive ──────────────────────────────────────────────────── */
    @media (max-width: 768px) {
      .grid {
        grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
        gap: 0.75rem;
      }
    }
    @media (max-width: 560px) {
      .page { padding: 0.25rem 0 2rem; }
      .page-header { margin-bottom: 1.25rem; padding-bottom: 1rem; }
      .controls { gap: 0.75rem; margin-bottom: 1.25rem; }

      /* Horizontal-scrolling chips on small screens, no wrap */
      .chips {
        flex-wrap: nowrap;
        overflow-x: auto;
        padding-bottom: 0.25rem;
        margin: 0 -0.75rem;
        padding-left: 0.75rem;
        padding-right: 0.75rem;
        scrollbar-width: thin;
      }
      .chips::-webkit-scrollbar { height: 3px; }
      .chips::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

      .grid {
        grid-template-columns: 1fr;
        gap: 0.625rem;
      }
      .tool-card { padding: 1rem 1rem 0.875rem 1.125rem; }
      .tool-title { font-size: 1rem; }
    }
  `],
})
export class ItToolsComponent implements OnInit {
  private readonly seo = inject(SeoService);

  readonly categories = CATEGORIES;
  readonly totalCount = TOOLS.length;
  readonly query = signal('');
  readonly activeCategory = signal<ToolCategory | null>(null);

  ngOnInit(): void {
    this.seo.apply({
      title: 'IT Tools — Utilitaires développeur 100 % côté client',
      description: `Catalogue de ${TOOLS.length} outils pour développeurs : encodage, conversion, calcul de sous-réseau, formatters JSON / YAML, hash. Tout tourne dans votre navigateur, aucune donnée n'est envoyée.`,
    });
  }

  readonly filteredTools = computed(() => {
    const q = this.query().trim().toLowerCase();
    const cat = this.activeCategory();
    return TOOLS.filter(t => {
      if (cat && t.category !== cat) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.slug.includes(q)
      );
    });
  });

  onSearch(ev: Event): void {
    this.query.set((ev.target as HTMLInputElement).value);
  }

  setCategory(cat: ToolCategory | null): void {
    this.activeCategory.set(cat);
  }

  categoryIcon(cat: ToolCategory): string {
    return CATEGORY_ICONS[cat];
  }

  categoryLabel(cat: ToolCategory): string {
    return CATEGORIES.find(c => c.id === cat)!.label;
  }

  categoryCount(cat: ToolCategory): number {
    return TOOLS.filter(t => t.category === cat).length;
  }

  /** Zero-pad index for the editorial TOC numbering anchor. */
  pad(n: number): string {
    return n.toString().padStart(2, '0');
  }
}
