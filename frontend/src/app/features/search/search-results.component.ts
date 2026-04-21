import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import * as Lucide from 'lucide-angular';
import { SearchService, SearchHit } from '../../core/services/search.service';

// Register every icon used by section headers AND by IT Tool cards (hit.icon
// comes straight from tools.catalog, so we need the full set here).
const icons = {
  Search: Lucide.Search,
  Code2: Lucide.Code2,
  Wrench: Lucide.Wrench,
  Hammer: Lucide.Hammer,
  X: Lucide.X,
  ArrowUpRight: Lucide.ArrowUpRight,
  SlidersHorizontal: Lucide.SlidersHorizontal,
  // IT Tools catalog icons
  Hash: Lucide.Hash,
  Key: Lucide.Key,
  Lock: Lucide.Lock,
  Binary: Lucide.Binary,
  Ticket: Lucide.Ticket,
  Fingerprint: Lucide.Fingerprint,
  KeyRound: Lucide.KeyRound,
  ShieldCheck: Lucide.ShieldCheck,
  Network: Lucide.Network,
  ArrowRightLeft: Lucide.ArrowRightLeft,
  Radio: Lucide.Radio,
  Link: Lucide.Link,
  Monitor: Lucide.Monitor,
  Calculator: Lucide.Calculator,
  Percent: Lucide.Percent,
  Braces: Lucide.Braces,
  FileCode: Lucide.FileCode,
  Regex: Lucide.Regex,
  Clock: Lucide.Clock,
  FileLock: Lucide.FileLock,
  GitCompare: Lucide.GitCompare,
  BadgeCheck: Lucide.BadgeCheck,
  TriangleAlert: Lucide.TriangleAlert,
};

type ResultType = 'snippet' | 'payload' | 'tool';

interface Section {
  key: ResultType;
  label: string;
  icon: string;
  variant: 'primary' | 'accent' | 'chart3';
  routePrefix: string;
  paramKey?: 'concept' | 'payload';
}

@Component({
  selector: 'app-search-results',
  imports: [LucideAngularModule, RouterLink],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <div class="page">
      <!-- ── Header ───────────────────────────────────────────────────── -->
      <header class="page-header">
        <div class="kicker">
          <span class="kicker-dot"></span>
          <span>
            @if (loading()) { searching… }
            @else if (query() || activeTag()) {
              {{ totalCount() }} result{{ totalCount() === 1 ? '' : 's' }}
            }
            @else { ready — type to search }
          </span>
        </div>

        <h1 class="page-title">
          @if (activeTag() && !query()) {
            Tag<span class="page-title-accent">.</span>
          } @else {
            Search<span class="page-title-accent">.</span>
          }
        </h1>

        <p class="page-subtitle">
          @if (query() && activeTag()) {
            "{{ query() }}" in resources tagged <span class="tag-pill">#{{ activeTag() }}</span>
          } @else if (query()) {
            Results for <span class="query-mono">"{{ query() }}"</span>
            across Dev Library, Cyber Toolbox &amp; IT Tools.
          } @else if (activeTag()) {
            Resources tagged <span class="tag-pill">#{{ activeTag() }}</span>
          } @else {
            Search snippets, payloads, tools and tags — all in one place.
          }
        </p>
      </header>

      <!-- ── Controls: search + type chips ────────────────────────────── -->
      <div class="controls">
        <div class="search-wrap">
          <lucide-icon name="search" [size]="16" [strokeWidth]="2" class="search-icon"></lucide-icon>
          <input
            type="text"
            class="search-input"
            placeholder="Refine your search…"
            [value]="query()"
            (input)="onQueryInput($event)"
            (keydown.enter)="commitQuery()"
            aria-label="Search query"
          />
          @if (query()) {
            <button class="search-clear" (click)="clearQuery()" aria-label="Clear">
              <lucide-icon name="x" [size]="14" [strokeWidth]="2"></lucide-icon>
            </button>
          }
        </div>

        <div class="chips" role="tablist" aria-label="Filter by type">
          <button
            type="button"
            class="chip"
            [class.chip-active]="activeTypes().size === 0"
            (click)="resetTypes()"
          >
            <span class="chip-count">{{ totalHits() }}</span>
            All
          </button>
          @for (t of sections; track t.key) {
            <button
              type="button"
              [class]="'chip cat-' + t.variant"
              [class.chip-active]="activeTypes().has(t.key)"
              (click)="toggleType(t.key)"
            >
              <span class="chip-count">{{ countByType(t.key) }}</span>
              {{ t.label }}
            </button>
          }
        </div>
      </div>

      <!-- ── Main: results + filters sidebar ──────────────────────────── -->
      <div class="body">
        <!-- ── Results ─────────────────────────────────────────────── -->
        <main class="results">
          @if (loading()) {
            <div class="empty">
              <span class="empty-code">// searching</span>
              <p>Fetching results from Meilisearch…</p>
            </div>
          } @else if (totalCount() === 0) {
            <div class="empty">
              <span class="empty-code">// no_match</span>
              @if (query() || activeTag()) {
                <p>No results. Try a broader keyword or clear some filters.</p>
              } @else {
                <p>Start typing above to search across Dev Library, Cyber Toolbox and IT Tools.</p>
              }
            </div>
          } @else {
            @for (section of sections; track section.key) {
              @let hits = filteredFor(section.key);
              @if (hits.length > 0) {
                <section class="result-section">
                  <header [class]="'section-head cat-' + section.variant">
                    <div class="section-icon">
                      <lucide-icon [name]="section.icon" [size]="16" [strokeWidth]="2"></lucide-icon>
                    </div>
                    <h2 class="section-title">{{ section.label }}</h2>
                    <span class="section-rule"></span>
                    <span class="section-count">{{ hits.length }}</span>
                  </header>

                  <div class="grid">
                    @for (hit of hits; track hit.id; let i = $index) {
                      <a
                        [class]="'hit-card cat-' + section.variant"
                        [routerLink]="linkFor(section, hit)"
                        [queryParams]="paramsFor(section, hit)"
                      >
                        <div class="hit-index">{{ pad(i + 1) }}</div>
                        <div class="hit-head">
                          <div class="hit-icon">
                            <lucide-icon [name]="hit.icon ?? section.icon" [size]="18" [strokeWidth]="1.75"></lucide-icon>
                          </div>
                          @if (hit.language) {
                            <span class="hit-meta-lbl">{{ hit.language }}</span>
                          } @else if (hit.category) {
                            <span class="hit-meta-lbl">{{ hit.category }}</span>
                          } @else {
                            <span class="hit-meta-lbl">{{ section.label }}</span>
                          }
                        </div>
                        <div class="hit-body">
                          <h3 class="hit-title">{{ hit.title }}</h3>
                          @if (hit.description) {
                            <p class="hit-desc">{{ hit.description }}</p>
                          }
                        </div>
                        <div class="hit-foot">
                          @if ((hit.tags ?? []).length > 0) {
                            <div class="hit-tags">
                              @for (tag of (hit.tags ?? []).slice(0, 3); track tag) {
                                <span class="hit-tag">#{{ tag }}</span>
                              }
                              @if ((hit.tags ?? []).length > 3) {
                                <span class="hit-tag hit-tag-more">+{{ (hit.tags ?? []).length - 3 }}</span>
                              }
                            </div>
                          } @else {
                            <span class="hit-slug">{{ hit.type === 'tool' ? '/' + hit.id : section.label }}</span>
                          }
                          <lucide-icon name="arrow-up-right" [size]="14" [strokeWidth]="2" class="hit-arrow"></lucide-icon>
                        </div>
                      </a>
                    }
                  </div>
                </section>
              }
            }
          }
        </main>

        <!-- ── Filters sidebar ────────────────────────────────────── -->
        <aside class="filters">
          <header class="filters-head">
            <lucide-icon name="sliders-horizontal" [size]="14" [strokeWidth]="2"></lucide-icon>
            <span>Refine</span>
            @if (hasActiveFilters()) {
              <button class="filters-reset" (click)="resetFilters()">Clear</button>
            }
          </header>

          @if (languageOptions().length > 0) {
            <div class="filter-group">
              <div class="filter-label">Language</div>
              <div class="filter-opts">
                @for (lang of languageOptions(); track lang) {
                  <label class="filter-chip" [class.filter-chip-active]="activeLanguages().has(lang)">
                    <input type="checkbox"
                      [checked]="activeLanguages().has(lang)"
                      (change)="toggleLanguage(lang)" />
                    <span>{{ lang }}</span>
                  </label>
                }
              </div>
            </div>
          }

          @if (categoryOptions().length > 0) {
            <div class="filter-group">
              <div class="filter-label">Category</div>
              <div class="filter-opts">
                @for (cat of categoryOptions(); track cat) {
                  <label class="filter-chip" [class.filter-chip-active]="activeCategories().has(cat)">
                    <input type="checkbox"
                      [checked]="activeCategories().has(cat)"
                      (change)="toggleCategory(cat)" />
                    <span>{{ cat }}</span>
                  </label>
                }
              </div>
            </div>
          }

          @if (tagOptions().length > 0) {
            <div class="filter-group">
              <div class="filter-label">Tags</div>
              <div class="filter-opts filter-opts-tags">
                @for (tag of tagOptions(); track tag) {
                  <label class="filter-chip" [class.filter-chip-active]="activeTags().has(tag)">
                    <input type="checkbox"
                      [checked]="activeTags().has(tag)"
                      (change)="toggleTag(tag)" />
                    <span>#{{ tag }}</span>
                  </label>
                }
              </div>
            </div>
          }

          @if (!hasFilterableOptions()) {
            <div class="filters-empty">
              @if (totalCount() === 0) {
                Run a search to unlock filters.
              } @else {
                No additional filters available.
              }
            </div>
          }
        </aside>
      </div>
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
      margin-bottom: 1.75rem;
      padding-bottom: 1.25rem;
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
      max-width: 48rem;
      line-height: 1.55;
    }
    .query-mono {
      font-family: 'JetBrains Mono', monospace;
      color: var(--foreground);
      padding: 0.0625rem 0.375rem;
      background: color-mix(in srgb, var(--foreground) 6%, transparent);
      border-radius: 3px;
    }
    .tag-pill {
      display: inline-flex;
      align-items: center;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8125rem;
      padding: 0.0625rem 0.4rem;
      background: color-mix(in srgb, var(--accent) 12%, transparent);
      color: var(--accent);
      border-radius: 3px;
    }

    /* ─── Controls ─────────────────────────────────────────────────────── */
    .controls {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
      margin-bottom: 1.5rem;
    }
    .search-wrap {
      position: relative;
      max-width: 34rem;
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
    .search-clear {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      width: 1.5rem;
      height: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border);
      background: var(--secondary);
      color: var(--muted-foreground);
      border-radius: 50%;
      cursor: pointer;
      transition: color 0.15s ease, border-color 0.15s ease;
    }
    .search-clear:hover { color: var(--foreground); border-color: var(--muted-foreground); }

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
      opacity: 0.75;
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

    /* ─── Body layout ──────────────────────────────────────────────────── */
    .body {
      display: grid;
      grid-template-columns: 1fr 16rem;
      gap: 1.5rem;
      align-items: start;
    }

    /* ─── Results ──────────────────────────────────────────────────────── */
    .results {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      min-width: 0;
    }

    .result-section {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }
    .section-head {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px dashed var(--border);
    }
    .section-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      border-radius: calc(var(--radius) - 3px);
      border: 1px solid var(--border);
      background: color-mix(in srgb, var(--secondary) 40%, transparent);
    }
    .section-title {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--foreground);
    }
    .section-rule {
      flex: 1;
      height: 1px;
      background: linear-gradient(to right, var(--border), transparent);
    }
    .section-count {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--muted-foreground);
      padding: 0.125rem 0.5rem;
      background: var(--secondary);
      border-radius: 9999px;
    }
    .section-head.cat-primary .section-icon { color: var(--primary); }
    .section-head.cat-accent  .section-icon { color: var(--accent); }
    .section-head.cat-chart3  .section-icon { color: var(--chart-3, #0891B2); }

    /* Grid & cards — mirrors the IT Tools atelier aesthetic */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr));
      gap: 0.875rem;
    }
    .hit-card {
      position: relative;
      display: grid;
      grid-template-rows: auto auto 1fr auto;
      gap: 0.75rem;
      padding: 1rem 1.125rem 0.875rem 1.25rem;
      background: var(--card);
      border: 1px solid var(--border);
      border-left: 3px solid var(--border);
      border-radius: calc(var(--radius) - 2px);
      text-decoration: none;
      color: inherit;
      overflow: hidden;
      transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
    }
    .hit-card::before {
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
    .hit-card:hover {
      transform: translateY(-2px);
      border-top-color: var(--muted-foreground);
      border-right-color: var(--muted-foreground);
      border-bottom-color: var(--muted-foreground);
    }
    .hit-card:hover::before { opacity: 1; }
    .hit-card:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }

    .cat-primary { border-left-color: var(--primary); }
    .cat-accent  { border-left-color: var(--accent); }
    .cat-chart3  { border-left-color: var(--chart-3, #0891B2); }

    .hit-index {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: var(--muted-foreground);
    }
    .hit-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .hit-icon {
      width: 2.25rem;
      height: 2.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) - 3px);
      background: color-mix(in srgb, var(--secondary) 40%, transparent);
      color: var(--foreground);
    }
    .cat-primary .hit-icon { color: var(--primary); }
    .cat-accent  .hit-icon { color: var(--accent); }
    .cat-chart3  .hit-icon { color: var(--chart-3, #0891B2); }
    .hit-meta-lbl {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted-foreground);
    }

    .hit-body { min-width: 0; }
    .hit-title {
      margin: 0 0 0.375rem;
      font-size: 1rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--foreground);
      line-height: 1.25;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .hit-desc {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--muted-foreground);
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .hit-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding-top: 0.625rem;
      border-top: 1px dashed var(--border);
    }
    .hit-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      min-width: 0;
    }
    .hit-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.625rem;
      padding: 0.0625rem 0.375rem;
      background: var(--secondary);
      color: var(--muted-foreground);
      border-radius: 3px;
      white-space: nowrap;
    }
    .hit-tag-more { opacity: 0.7; }
    .hit-slug {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.6875rem;
      color: var(--muted-foreground);
      letter-spacing: 0.02em;
    }
    .hit-arrow {
      color: var(--muted-foreground);
      flex-shrink: 0;
      transition: transform 0.2s ease, color 0.2s ease;
    }
    .hit-card:hover .hit-arrow {
      transform: translate(2px, -2px);
      color: var(--foreground);
    }

    /* ─── Filters sidebar ──────────────────────────────────────────────── */
    .filters {
      position: sticky;
      top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding: 1rem 1.125rem;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) - 2px);
    }
    .filters-head {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--foreground);
      padding-bottom: 0.625rem;
      border-bottom: 1px dashed var(--border);
    }
    .filters-reset {
      margin-left: auto;
      border: none;
      background: transparent;
      color: var(--muted-foreground);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      cursor: pointer;
    }
    .filters-reset:hover { color: var(--destructive); }

    .filter-group { display: flex; flex-direction: column; gap: 0.5rem; }
    .filter-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.625rem;
      font-weight: 600;
      color: var(--muted-foreground);
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .filter-opts {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }
    .filter-opts-tags { max-height: 11rem; overflow-y: auto; }
    .filter-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border: 1px solid var(--border);
      border-radius: 9999px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.6875rem;
      color: var(--muted-foreground);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .filter-chip:hover {
      border-color: var(--muted-foreground);
      color: var(--foreground);
    }
    .filter-chip input {
      /* Hidden but keeps the label keyboard-accessible */
      position: absolute;
      opacity: 0;
      pointer-events: none;
      width: 0; height: 0;
    }
    .filter-chip-active {
      background: var(--foreground);
      color: var(--background);
      border-color: var(--foreground);
    }
    .filter-chip-active:hover {
      color: var(--background);
    }

    .filters-empty {
      font-size: 0.75rem;
      color: var(--muted-foreground);
      padding: 0.75rem 0;
      text-align: center;
      font-style: italic;
    }

    /* ─── Empty state ──────────────────────────────────────────────────── */
    .empty {
      text-align: center;
      padding: 3.5rem 1.5rem;
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

    /* ─── Responsive ───────────────────────────────────────────────────── */
    @media (max-width: 960px) {
      .body {
        grid-template-columns: 1fr;
      }
      .filters {
        position: static;
        order: -1;
      }
      .filter-opts-tags { max-height: 8rem; }
    }
    @media (max-width: 560px) {
      .page { padding: 0.25rem 0 2rem; }
      .page-header { margin-bottom: 1.25rem; padding-bottom: 1rem; }
      .controls { margin-bottom: 1.25rem; }
      .grid {
        grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
        gap: 0.75rem;
      }
    }
  `],
})
export class SearchResultsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly searchService = inject(SearchService);

  readonly query = signal('');
  readonly activeTag = signal<string | null>(null);
  readonly hits = signal<SearchHit[]>([]);
  readonly loading = signal(false);

  readonly activeTypes = signal(new Set<ResultType>());
  readonly activeLanguages = signal(new Set<string>());
  readonly activeCategories = signal(new Set<string>());
  readonly activeTags = signal(new Set<string>());

  readonly sections: Section[] = [
    { key: 'snippet', label: 'Dev Library',   icon: 'code-2',  variant: 'primary', routePrefix: '/dev-library',   paramKey: 'concept' },
    { key: 'payload', label: 'Cyber Toolbox', icon: 'wrench',  variant: 'accent',  routePrefix: '/cyber-toolbox', paramKey: 'payload' },
    { key: 'tool',    label: 'IT Tools',      icon: 'hammer',  variant: 'chart3',  routePrefix: '/it-tools' },
  ];

  private readonly input$ = new Subject<string>();
  private subs: Subscription[] = [];

  ngOnInit(): void {
    this.subs.push(
      this.route.queryParamMap.subscribe(pm => {
        const q = pm.get('q') ?? '';
        const tag = pm.get('tag');
        this.query.set(q);
        this.activeTag.set(tag);
        if (tag) this.activeTags.set(new Set([tag]));
        this.runSearch();
      }),
    );

    this.subs.push(
      this.input$.pipe(debounceTime(250)).subscribe(q => {
        this.query.set(q);
        this.runSearch();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  // ── Search ───────────────────────────────────────────────────────────
  private runSearch(): void {
    const q = this.query().trim();
    const tag = this.activeTag();
    const effectiveQuery = q || tag || '';
    if (!effectiveQuery) {
      this.hits.set([]);
      return;
    }
    this.loading.set(true);
    this.searchService.searchAll(effectiveQuery, 50).subscribe({
      next: hits => {
        this.hits.set(hits);
        this.loading.set(false);
      },
      error: () => {
        this.hits.set([]);
        this.loading.set(false);
      },
    });
  }

  onQueryInput(e: Event): void {
    this.input$.next((e.target as HTMLInputElement).value);
  }

  commitQuery(): void {
    const q = this.query().trim();
    this.router.navigate(['/search'], {
      queryParams: { q: q || null },
      queryParamsHandling: 'merge',
    });
  }

  clearQuery(): void {
    this.query.set('');
    this.router.navigate(['/search'], {
      queryParams: { q: null },
      queryParamsHandling: 'merge',
    });
    this.runSearch();
  }

  // ── Filter option lists ──────────────────────────────────────────────
  readonly languageOptions = computed(() => {
    const set = new Set<string>();
    for (const h of this.hits()) if (h.type === 'snippet' && h.language) set.add(h.language);
    return [...set].sort();
  });

  readonly categoryOptions = computed(() => {
    const set = new Set<string>();
    for (const h of this.hits()) {
      if ((h.type === 'payload' || h.type === 'tool') && h.category) set.add(h.category);
    }
    return [...set].sort();
  });

  readonly tagOptions = computed(() => {
    const set = new Set<string>();
    for (const h of this.hits()) for (const t of h.tags ?? []) set.add(t);
    const urlTag = this.activeTag();
    if (urlTag) set.add(urlTag);
    return [...set].sort();
  });

  hasFilterableOptions(): boolean {
    return this.languageOptions().length > 0
        || this.categoryOptions().length > 0
        || this.tagOptions().length > 0;
  }

  // ── Filter predicates ────────────────────────────────────────────────
  private matchesFilters(h: SearchHit): boolean {
    const types = this.activeTypes();
    if (types.size > 0 && !types.has(h.type as ResultType)) return false;

    const langs = this.activeLanguages();
    if (langs.size > 0) {
      if (h.type !== 'snippet' || !h.language || !langs.has(h.language)) return false;
    }

    const cats = this.activeCategories();
    if (cats.size > 0) {
      if (!(h.type === 'payload' || h.type === 'tool') || !h.category || !cats.has(h.category)) return false;
    }

    const tags = this.activeTags();
    if (tags.size > 0) {
      const hitTags = h.tags ?? [];
      let matched = false;
      for (const t of tags) if (hitTags.includes(t)) { matched = true; break; }
      if (!matched) return false;
    }

    return true;
  }

  filteredFor(type: ResultType): SearchHit[] {
    return this.hits().filter(h => h.type === type && this.matchesFilters(h));
  }

  readonly totalCount = computed(() =>
    this.sections.reduce((n, s) => n + this.filteredFor(s.key).length, 0));

  totalHits(): number {
    return this.hits().filter(h => h.type !== 'tag').length;
  }

  countByType(type: ResultType): number {
    return this.hits().filter(h => h.type === type).length;
  }

  hasActiveFilters(): boolean {
    return this.activeTypes().size > 0
        || this.activeLanguages().size > 0
        || this.activeCategories().size > 0
        || this.activeTags().size > 0;
  }

  // ── Toggles ──────────────────────────────────────────────────────────
  private toggle<T>(sig: { (): Set<T>; set: (v: Set<T>) => void }, value: T): void {
    const next = new Set(sig());
    if (next.has(value)) next.delete(value); else next.add(value);
    sig.set(next);
  }

  toggleType(t: ResultType): void { this.toggle(this.activeTypes, t); }
  toggleLanguage(l: string): void { this.toggle(this.activeLanguages, l); }
  toggleCategory(c: string): void { this.toggle(this.activeCategories, c); }
  toggleTag(t: string): void { this.toggle(this.activeTags, t); }

  resetTypes(): void {
    this.activeTypes.set(new Set());
  }

  resetFilters(): void {
    this.activeTypes.set(new Set());
    this.activeLanguages.set(new Set());
    this.activeCategories.set(new Set());
    this.activeTags.set(new Set());
    if (this.activeTag()) {
      this.activeTag.set(null);
      this.router.navigate(['/search'], {
        queryParams: { tag: null },
        queryParamsHandling: 'merge',
      });
    }
  }

  // 2-digit zero-padded index, like "01", "07", "12". Used on cards.
  pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  linkFor(section: Section, hit: SearchHit): unknown[] {
    if (hit.type === 'tool') return ['/it-tools', hit.id];
    return [section.routePrefix];
  }

  paramsFor(section: Section, hit: SearchHit): Record<string, string> | null {
    if (!section.paramKey) return null;
    return { [section.paramKey]: hit.id };
  }
}
