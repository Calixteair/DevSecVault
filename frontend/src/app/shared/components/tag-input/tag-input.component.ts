import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
  input,
  output,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  X,
  Star,
  Plus,
  Hash,
} from 'lucide-angular';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { TagService } from '../../../core/services/tag.service';
import { TagSearchHit } from '../../../core/models/tag.model';

const icons = { X, Star, Plus, Hash };

/**
 * Reusable chip-style tag input with Meilisearch autocomplete.
 *
 * Usage:
 *   <app-tag-input
 *     [tags]="editTags"
 *     (tagsChange)="onTagsChange($event)"
 *   />
 *
 * - Type to search: dropdown shows matching tags with official ones (⭐) first.
 * - Enter / comma / click to pick. Backspace on empty input removes last chip.
 * - If the typed text matches no existing tag, a "Create new: xxx" option
 *   appears at the bottom (backend will auto-create it on save).
 * - Names are normalized: trimmed + lowercased.
 */
@Component({
  selector: 'app-tag-input',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <div class="tag-input-root" (click)="focusInput()">
      <div class="tag-chips">
        @for (name of tags(); track name) {
          <span class="tag-chip" [class.official]="isOfficial(name)">
            @if (isOfficial(name)) {
              <lucide-icon name="star" [size]="10" [strokeWidth]="2.5"></lucide-icon>
            } @else {
              <lucide-icon name="hash" [size]="10" [strokeWidth]="2"></lucide-icon>
            }
            <span class="tag-chip-name">{{ name }}</span>
            <button
              type="button"
              class="tag-chip-remove"
              (click)="removeTag(name); $event.stopPropagation()"
              [attr.aria-label]="'Remove tag ' + name"
            >
              <lucide-icon name="x" [size]="10" [strokeWidth]="2.5"></lucide-icon>
            </button>
          </span>
        }
        <input
          #inputEl
          type="text"
          class="tag-input-field"
          [placeholder]="tags().length === 0 ? placeholder() : ''"
          [(ngModel)]="queryText"
          (ngModelChange)="onQueryChange($event)"
          (keydown)="onKeydown($event)"
          (focus)="onFocus()"
          (blur)="onBlur()"
          [attr.aria-label]="'Add tag'"
        />
      </div>

      @if (dropdownOpen() && (hits().length > 0 || canCreate())) {
        <ul class="tag-suggestions" (mousedown)="$event.preventDefault()">
          @for (hit of hits(); track hit.id) {
            <li
              class="tag-suggestion"
              [class.highlighted]="highlightIndex() === $index"
              (click)="pickHit(hit)"
              (mouseenter)="highlightIndex.set($index)"
            >
              @if (hit.isOfficial) {
                <lucide-icon name="star" [size]="11" [strokeWidth]="2.5" class="official-icon"></lucide-icon>
              } @else {
                <lucide-icon name="hash" [size]="11" [strokeWidth]="2" class="hash-icon"></lucide-icon>
              }
              <span class="suggestion-name">{{ hit.name }}</span>
              <span class="suggestion-meta font-mono">
                @if (hit.isOfficial) { OFFICIAL · }
                {{ hit.usageCount }} use{{ hit.usageCount === 1 ? '' : 's' }}
              </span>
            </li>
          }
          @if (canCreate()) {
            <li
              class="tag-suggestion create-option"
              [class.highlighted]="highlightIndex() === hits().length"
              (click)="pickNew()"
              (mouseenter)="highlightIndex.set(hits().length)"
            >
              <lucide-icon name="plus" [size]="11" [strokeWidth]="2.5"></lucide-icon>
              <span class="suggestion-name">
                Create new: <strong>{{ normalizedQuery() }}</strong>
              </span>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    :host { display: block; position: relative; }

    .tag-input-root {
      display: flex; flex-direction: column;
      position: relative;
      min-height: 2.5rem;
      padding: 0.375rem 0.5rem;
      background: var(--input-background);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      cursor: text;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .tag-input-root:focus-within {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent);
    }

    .tag-chips {
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.375rem;
    }

    .tag-chip {
      display: inline-flex; align-items: center; gap: 0.25rem;
      padding: 0.1875rem 0.5rem;
      background: color-mix(in srgb, var(--primary) 10%, transparent);
      color: var(--primary);
      border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent);
      border-radius: 999px;
      font-size: 0.75rem; font-weight: 500;
      font-family: 'JetBrains Mono', monospace;
      line-height: 1;
    }
    .tag-chip.official {
      background: color-mix(in srgb, var(--accent) 14%, transparent);
      color: var(--accent);
      border-color: color-mix(in srgb, var(--accent) 40%, transparent);
    }
    .tag-chip-name { letter-spacing: 0.01em; }
    .tag-chip-remove {
      display: inline-flex; align-items: center; justify-content: center;
      width: 14px; height: 14px;
      padding: 0;
      background: transparent; border: none;
      color: inherit; opacity: 0.7;
      cursor: pointer; border-radius: 999px;
      transition: opacity 0.12s, background-color 0.12s;
    }
    .tag-chip-remove:hover { opacity: 1; background: color-mix(in srgb, currentColor 20%, transparent); }

    .tag-input-field {
      flex: 1;
      min-width: 8rem;
      padding: 0.25rem 0.25rem;
      background: transparent;
      border: none;
      color: var(--foreground);
      font-size: 0.875rem;
      font-family: 'JetBrains Mono', monospace;
      outline: none;
    }
    .tag-input-field::placeholder { color: var(--muted-foreground); opacity: 0.7; }

    .tag-suggestions {
      position: absolute;
      top: calc(100% + 0.25rem);
      left: 0; right: 0;
      z-index: 20;
      max-height: 16rem;
      overflow-y: auto;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.3);
      list-style: none; padding: 0.25rem; margin: 0;
    }
    .tag-suggestion {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.5rem 0.625rem;
      border-radius: calc(var(--radius) - 2px);
      cursor: pointer;
      transition: background-color 0.1s;
      font-size: 0.8125rem;
      color: var(--foreground);
    }
    .tag-suggestion.highlighted,
    .tag-suggestion:hover {
      background: color-mix(in srgb, var(--primary) 10%, transparent);
    }
    .tag-suggestion .official-icon { color: var(--accent); flex-shrink: 0; }
    .tag-suggestion .hash-icon { color: var(--muted-foreground); flex-shrink: 0; }
    .suggestion-name {
      flex: 1;
      font-family: 'JetBrains Mono', monospace;
      word-break: break-word;
    }
    .suggestion-meta {
      font-size: 0.6875rem;
      color: var(--muted-foreground);
      flex-shrink: 0;
    }

    .tag-suggestion.create-option {
      border-top: 1px solid var(--border);
      margin-top: 0.25rem;
      padding-top: 0.5rem;
      color: var(--muted-foreground);
    }
    .tag-suggestion.create-option strong {
      color: var(--primary);
      font-weight: 600;
    }

    .font-mono { font-family: 'JetBrains Mono', monospace; }
  `],
})
export class TagInputComponent {
  private readonly tagService = inject(TagService);

  // ---- Inputs / outputs ----------------------------------------------------

  readonly tags = input<string[]>([]);
  readonly placeholder = input<string>('Add tags…');
  readonly maxTags = input<number>(20);
  readonly tagsChange = output<string[]>();

  // ---- Local state ---------------------------------------------------------

  readonly queryText = signal('');
  readonly hits = signal<TagSearchHit[]>([]);
  readonly dropdownOpen = signal(false);
  readonly highlightIndex = signal(0);

  /** Map of tag name → isOfficial, used to render chips with the star badge. */
  private readonly officialCache = new Map<string, boolean>();

  readonly normalizedQuery = computed(() =>
    this.queryText().trim().toLowerCase(),
  );

  /**
   * Show "Create new" when the query has text, isn't already in tags(),
   * and doesn't exactly match an existing hit.
   */
  readonly canCreate = computed(() => {
    const q = this.normalizedQuery();
    if (q.length < 2 || q.length > 100) return false;
    if (this.tags().includes(q)) return false;
    return !this.hits().some(h => h.name.toLowerCase() === q);
  });

  private readonly searchSubject = new Subject<string>();

  @ViewChild('inputEl') private inputEl?: ElementRef<HTMLInputElement>;

  constructor() {
    this.searchSubject
      .pipe(
        debounceTime(120),
        distinctUntilChanged(),
        switchMap(q => (q.length === 0 ? this.tagService.search('', 10) : this.tagService.search(q, 10))),
      )
      .subscribe(hits => {
        // Hide tags already selected from the dropdown
        const selected = new Set(this.tags());
        const filtered = hits.filter(h => !selected.has(h.name));
        this.hits.set(filtered);
        // Cache `isOfficial` for chip rendering
        for (const h of hits) {
          this.officialCache.set(h.name, h.isOfficial);
        }
        this.highlightIndex.set(0);
      });

    // Kick off an initial empty search when the input opens so the dropdown
    // shows the most popular tags without any typing.
    effect(() => {
      if (this.dropdownOpen()) {
        this.searchSubject.next(this.normalizedQuery());
      }
    });
  }

  // ---- Input handling ------------------------------------------------------

  onQueryChange(v: string): void {
    this.dropdownOpen.set(true);
    this.searchSubject.next(v.trim().toLowerCase());
  }

  onFocus(): void {
    this.dropdownOpen.set(true);
  }

  onBlur(): void {
    // Defer so a click on a suggestion registers before the dropdown closes.
    setTimeout(() => this.dropdownOpen.set(false), 120);
  }

  onKeydown(ev: KeyboardEvent): void {
    const optionsCount = this.hits().length + (this.canCreate() ? 1 : 0);

    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.dropdownOpen.set(true);
      if (optionsCount > 0) {
        this.highlightIndex.set((this.highlightIndex() + 1) % optionsCount);
      }
      return;
    }
    if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      if (optionsCount > 0) {
        this.highlightIndex.set((this.highlightIndex() - 1 + optionsCount) % optionsCount);
      }
      return;
    }
    if (ev.key === 'Enter' || ev.key === ',' || ev.key === 'Tab') {
      const idx = this.highlightIndex();
      if (this.dropdownOpen() && idx < this.hits().length) {
        ev.preventDefault();
        this.pickHit(this.hits()[idx]);
      } else if (this.dropdownOpen() && this.canCreate() && idx === this.hits().length) {
        ev.preventDefault();
        this.pickNew();
      } else if (this.normalizedQuery().length >= 2) {
        ev.preventDefault();
        this.pickNew();
      }
      return;
    }
    if (ev.key === 'Backspace' && this.queryText() === '' && this.tags().length > 0) {
      ev.preventDefault();
      const next = [...this.tags()];
      next.pop();
      this.emit(next);
      return;
    }
    if (ev.key === 'Escape') {
      this.dropdownOpen.set(false);
    }
  }

  // ---- Actions -------------------------------------------------------------

  focusInput(): void {
    this.inputEl?.nativeElement.focus();
  }

  pickHit(hit: TagSearchHit): void {
    this.officialCache.set(hit.name, hit.isOfficial);
    this.addTag(hit.name);
  }

  pickNew(): void {
    const name = this.normalizedQuery();
    if (name.length >= 2 && name.length <= 100) {
      this.addTag(name);
    }
  }

  removeTag(name: string): void {
    this.emit(this.tags().filter(t => t !== name));
  }

  isOfficial(name: string): boolean {
    return this.officialCache.get(name) ?? false;
  }

  private addTag(name: string): void {
    if (this.tags().length >= this.maxTags()) return;
    if (this.tags().includes(name)) {
      this.queryText.set('');
      return;
    }
    this.emit([...this.tags(), name]);
    this.queryText.set('');
    this.searchSubject.next('');
  }

  private emit(next: string[]): void {
    this.tagsChange.emit(next);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent): void {
    const root = this.inputEl?.nativeElement.closest('.tag-input-root');
    if (root && !root.contains(ev.target as Node)) {
      this.dropdownOpen.set(false);
    }
  }
}
