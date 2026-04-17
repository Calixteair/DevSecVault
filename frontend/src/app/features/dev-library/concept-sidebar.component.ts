import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  ChevronRight,
  ChevronDown,
  Folder,
  Code,
  Search,
  Plus,
  FileCode,
  Hash,
  Lock,
  Globe,
} from 'lucide-angular';
import { ConceptListItem } from '../../core/models/concept.model';

const icons = { ChevronRight, ChevronDown, Folder, Code, Search, Plus, FileCode, Hash, Lock, Globe };

interface LanguageGroup {
  language: string;
  concepts: ConceptListItem[];
  expanded: boolean;
}

@Component({
  selector: 'app-concept-sidebar',
  imports: [FormsModule, LucideAngularModule],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <aside class="concept-sidebar">
      <div class="sidebar-header">
        <h2 class="sidebar-title">
          <lucide-icon name="code" [size]="18" [strokeWidth]="2"></lucide-icon>
          Dev Library
        </h2>
        @if (canCreate) {
          <button class="btn-new" (click)="createConcept.emit()" title="New Concept">
            <lucide-icon name="plus" [size]="16" [strokeWidth]="2"></lucide-icon>
          </button>
        }
      </div>

      <div class="sidebar-search">
        <lucide-icon name="search" [size]="14" [strokeWidth]="2" class="search-icon"></lucide-icon>
        <input
          type="text"
          class="search-input font-mono"
          placeholder="Filter (name, lang, tag, desc)..."
          [ngModel]="filterText()"
          (ngModelChange)="filterText.set($event)"
        />
      </div>

      @if (isAuthenticated) {
        <div class="sidebar-visibility-toggle">
          <button
            class="vis-btn"
            [class.active]="!privateOnly()"
            (click)="privateOnly.set(false)"
            title="Show all (public + private)"
          >
            <lucide-icon name="globe" [size]="12" [strokeWidth]="2"></lucide-icon>
            All
          </button>
          <button
            class="vis-btn"
            [class.active]="privateOnly()"
            (click)="privateOnly.set(true)"
            title="Show only my private concepts"
          >
            <lucide-icon name="lock" [size]="12" [strokeWidth]="2"></lucide-icon>
            Private
          </button>
        </div>
      }

      <div class="sidebar-tree">
        @if (filteredGroups().length === 0) {
          <div class="empty-tree">
            <lucide-icon name="folder" [size]="32" [strokeWidth]="1.5" class="empty-icon"></lucide-icon>
            <p class="empty-text">No concepts yet</p>
            @if (canCreate) {
              <button class="btn-create-first" (click)="createConcept.emit()">
                <lucide-icon name="plus" [size]="14" [strokeWidth]="2"></lucide-icon>
                Create your first concept
              </button>
            }
          </div>
        }

        @for (group of filteredGroups(); track group.language) {
          <div class="tree-group">
            <button class="tree-folder" (click)="toggleGroup(group.language)">
              @if (expandedLanguages().has(group.language)) {
                <lucide-icon name="chevron-down" [size]="14" [strokeWidth]="2"></lucide-icon>
              } @else {
                <lucide-icon name="chevron-right" [size]="14" [strokeWidth]="2"></lucide-icon>
              }
              <lucide-icon name="folder" [size]="14" [strokeWidth]="2" class="folder-icon"></lucide-icon>
              <span class="folder-name">{{ group.language }}</span>
              <span class="folder-count">{{ group.concepts.length }}</span>
            </button>

            @if (expandedLanguages().has(group.language)) {
              <div class="tree-items">
                @for (concept of group.concepts; track concept.id) {
                  <button
                    class="tree-item"
                    [class.active]="selectedConceptId === concept.id"
                    (click)="selectConcept.emit({ concept, language: group.language })"
                  >
                    <lucide-icon name="file-code" [size]="14" [strokeWidth]="2" class="item-icon"></lucide-icon>
                    <span class="item-name">{{ concept.title }}</span>
                    @if (concept.snippetCount > 1) {
                      <span class="item-count font-mono">{{ concept.snippetCount }}</span>
                    }
                  </button>
                }
              </div>
            }
          </div>
        }
      </div>
    </aside>
  `,
  styles: [`
    .concept-sidebar {
      width: 16rem;
      min-width: 16rem;
      height: 100%;
      background: var(--card);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 0.75rem 0.75rem;
      border-bottom: 1px solid var(--border);
    }

    .sidebar-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--primary);
    }

    .btn-new {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      background: transparent;
      color: var(--primary);
      cursor: pointer;
      transition: background-color 0.15s ease;
    }
    .btn-new:hover {
      background: var(--primary);
      color: var(--primary-foreground);
    }

    .sidebar-search {
      position: relative;
      padding: 0.75rem;
    }
    .search-icon {
      position: absolute;
      left: 1.25rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--muted-foreground);
      pointer-events: none;
    }
    .search-input {
      width: 100%;
      height: 2rem;
      padding: 0 0.5rem 0 2rem;
      background: var(--input-background);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--foreground);
      font-size: 0.75rem;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .search-input::placeholder {
      color: var(--muted-foreground);
    }
    .search-input:focus {
      border-color: var(--primary);
    }

    .sidebar-visibility-toggle {
      display: flex;
      gap: 0.25rem;
      padding: 0 0.75rem 0.5rem;
    }
    .vis-btn {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      height: 1.75rem;
      padding: 0 0.5rem;
      border: 1px solid var(--border);
      background: transparent;
      border-radius: var(--radius);
      color: var(--muted-foreground);
      font-size: 0.6875rem;
      font-family: inherit;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    }
    .vis-btn:hover:not(.active) {
      background: var(--secondary);
      color: var(--foreground);
    }
    .vis-btn.active {
      background: var(--primary);
      border-color: var(--primary);
      color: var(--primary-foreground);
    }

    .sidebar-tree {
      flex: 1;
      overflow-y: auto;
      padding: 0.25rem 0;
    }

    .empty-tree {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      text-align: center;
      gap: 0.75rem;
    }
    .empty-icon {
      color: var(--muted-foreground);
      opacity: 0.5;
    }
    .empty-text {
      font-size: 0.8125rem;
      color: var(--muted-foreground);
    }
    .btn-create-first {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.75rem;
      border-radius: var(--radius);
      border: 1px dashed var(--primary);
      background: transparent;
      color: var(--primary);
      font-size: 0.75rem;
      font-family: inherit;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }
    .btn-create-first:hover {
      background: color-mix(in srgb, var(--primary) 10%, transparent);
    }

    .tree-group {
      margin-bottom: 0.125rem;
    }

    .tree-folder {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      width: 100%;
      padding: 0.375rem 0.75rem;
      border: none;
      background: transparent;
      color: var(--foreground);
      font-size: 0.8125rem;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }
    .tree-folder:hover {
      background: var(--secondary);
    }
    .folder-icon {
      color: var(--primary);
    }
    .folder-name {
      flex: 1;
      text-align: left;
      text-transform: capitalize;
    }
    .folder-count {
      font-size: 0.6875rem;
      color: var(--muted-foreground);
      background: var(--secondary);
      padding: 0.0625rem 0.375rem;
      border-radius: 9999px;
      font-family: 'JetBrains Mono', monospace;
    }

    .tree-items {
      padding-left: 0.5rem;
    }

    .tree-item {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      width: 100%;
      padding: 0.3125rem 0.75rem 0.3125rem 1.25rem;
      border: none;
      background: transparent;
      color: var(--muted-foreground);
      font-size: 0.75rem;
      font-family: inherit;
      cursor: pointer;
      transition: background-color 0.15s ease, color 0.15s ease;
      text-align: left;
    }
    .tree-item:hover {
      background: var(--secondary);
      color: var(--foreground);
    }
    .tree-item.active {
      background: color-mix(in srgb, var(--primary) 15%, transparent);
      color: var(--primary);
    }
    .item-icon {
      flex-shrink: 0;
    }
    .item-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .item-count {
      font-size: 0.625rem;
      color: var(--muted-foreground);
      opacity: 0.7;
    }

    @media (max-width: 768px) {
      .concept-sidebar {
        width: 100%;
        min-width: 0;
        height: auto;
        max-height: 14rem;
        border-right: none;
        border-bottom: 1px solid var(--border);
      }
    }
  `],
})
export class ConceptSidebarComponent {
  private readonly _concepts = signal<ConceptListItem[]>([]);

  @Input() set concepts(value: ConceptListItem[]) {
    this._concepts.set(value ?? []);
    // Auto-expand all groups whenever the concept list changes
    const allLangs = new Set<string>();
    for (const c of value ?? []) {
      const langs = c.languages?.length ? c.languages : ['other'];
      for (const l of langs) allLangs.add(l);
    }
    this.expandedLanguages.set(allLangs);
  }

  @Input() selectedConceptId: string | null = null;
  @Input() canCreate = false;
  @Input() isAuthenticated = false;

  @Output() selectConcept = new EventEmitter<{ concept: ConceptListItem; language: string }>();
  @Output() createConcept = new EventEmitter<void>();

  readonly filterText = signal('');
  readonly privateOnly = signal(false);
  readonly expandedLanguages = signal<Set<string>>(new Set());

  readonly filteredGroups = computed(() => {
    const filter = this.filterText().trim().toLowerCase();
    const privateOnly = this.privateOnly();
    const concepts = this._concepts();

    // Group concepts by snippet languages
    const langMap = new Map<string, ConceptListItem[]>();
    for (const concept of concepts) {
      if (privateOnly && concept.visibility !== 'private') {
        continue;
      }
      if (filter && !this.matchesFilter(concept, filter)) {
        continue;
      }
      const languages = concept.languages?.length ? concept.languages : ['other'];
      // Only narrow the displayed language groups when the filter matches a language
      // AND doesn't match the title/description/tags — otherwise a stray letter
      // (e.g. "t" also appears in "python") would wrongly hide sibling languages.
      const matchesMeta = filter ? this.matchesMetadata(concept, filter) : true;
      const matchingLangs = filter && !matchesMeta
        ? languages.filter(l => l.toLowerCase().includes(filter))
        : [];
      const langsToShow = matchingLangs.length > 0 ? matchingLangs : languages;
      for (const lang of langsToShow) {
        const group = langMap.get(lang) ?? [];
        group.push(concept);
        langMap.set(lang, group);
      }
    }

    // Sort groups alphabetically
    const groups: LanguageGroup[] = [];
    const sortedKeys = Array.from(langMap.keys()).sort((a, b) => a.localeCompare(b));
    for (const key of sortedKeys) {
      groups.push({
        language: key,
        concepts: langMap.get(key)!,
        expanded: this.expandedLanguages().has(key),
      });
    }

    return groups;
  });

  toggleGroup(language: string): void {
    const current = new Set(this.expandedLanguages());
    if (current.has(language)) {
      current.delete(language);
    } else {
      current.add(language);
    }
    this.expandedLanguages.set(current);
  }

  private matchesFilter(concept: ConceptListItem, q: string): boolean {
    if (this.matchesMetadata(concept, q)) return true;
    if (concept.languages?.some(l => l.toLowerCase().includes(q))) return true;
    return false;
  }

  private matchesMetadata(concept: ConceptListItem, q: string): boolean {
    if (concept.title.toLowerCase().includes(q)) return true;
    if (concept.description?.toLowerCase().includes(q)) return true;
    if (concept.tags?.some(t => t.name.toLowerCase().includes(q))) return true;
    return false;
  }
}
