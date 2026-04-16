import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  effect,
  inject,
  input,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, LowerCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  Code,
  Copy,
  Check,
  Edit3,
  Save,
  Trash2,
  Terminal,
  Variable,
  Eye,
  Plus,
} from 'lucide-angular';
import { MonacoEditorComponent } from '../../shared/components/monaco-editor/monaco-editor.component';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { Concept, Snippet } from '../../core/models/concept.model';

const icons = { Code, Copy, Check, Edit3, Save, Trash2, Terminal, Variable, Eye, Plus };

interface TemplateVariable {
  name: string;
  value: string;
}

@Component({
  selector: 'app-concept-editor',
  imports: [FormsModule, LowerCasePipe, LucideAngularModule, MonacoEditorComponent],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <div class="concept-editor">
      <!-- Header -->
      <div class="editor-header">
        <div class="header-left">
          <h1 class="concept-title">{{ concept().title }}</h1>
          @if (concept().description) {
            <p class="concept-description">{{ concept().description }}</p>
          }
          <div class="header-meta">
            @for (snippet of concept().snippets; track snippet.id ?? $index) {
              <span class="badge-language font-mono">{{ snippet.language }}</span>
            }
            @if (templateVariables().length > 0) {
              <span class="badge-vars font-mono">
                <lucide-icon name="variable" [size]="12" [strokeWidth]="2"></lucide-icon>
                {{ templateVariables().length }} variable{{ templateVariables().length > 1 ? 's' : '' }}
              </span>
            }
            <span class="badge-visibility font-mono">{{ concept().visibility }}</span>
          </div>
        </div>
        <div class="header-actions">
          @if (canModify) {
            @if (isEditing()) {
              <button class="btn btn-primary" (click)="onSave()">
                <lucide-icon name="save" [size]="14" [strokeWidth]="2"></lucide-icon>
                Save
              </button>
              <button class="btn btn-ghost" (click)="cancelEdit()">
                Cancel
              </button>
            } @else {
              <button class="btn btn-outline" (click)="startEdit()">
                <lucide-icon name="edit-3" [size]="14" [strokeWidth]="2"></lucide-icon>
                Edit
              </button>
              <button class="btn btn-danger" (click)="confirmDeleteConcept()" title="Delete concept">
                <lucide-icon name="trash-2" [size]="14" [strokeWidth]="2"></lucide-icon>
                Delete
              </button>
            }
          }
          <button class="btn btn-primary" (click)="copyCode()" [disabled]="copySuccess()">
            @if (copySuccess()) {
              <lucide-icon name="check" [size]="14" [strokeWidth]="2"></lucide-icon>
              Copied!
            } @else {
              <lucide-icon name="copy" [size]="14" [strokeWidth]="2"></lucide-icon>
              Copy Code
            }
          </button>
        </div>
      </div>

      <!-- Language Tabs -->
      @if (concept().snippets.length > 1 || (canModify && isEditing())) {
        <div class="language-tabs">
          @for (snippet of concept().snippets; track snippet.id ?? $index) {
            <div class="tab-wrap" [class.active]="selectedSnippetIndex() === $index">
              <button
                class="tab"
                [class.active]="selectedSnippetIndex() === $index"
                (click)="selectSnippet($index)"
              >
                <lucide-icon name="code" [size]="14" [strokeWidth]="2"></lucide-icon>
                {{ snippet.language }}
              </button>
              @if (isEditing() && canModify && concept().snippets.length > 1) {
                <button
                  class="tab-delete"
                  (click)="confirmDeleteSnippet(snippet)"
                  title="Delete this snippet"
                >
                  <lucide-icon name="trash-2" [size]="12" [strokeWidth]="2"></lucide-icon>
                </button>
              }
            </div>
          }
          @if (isEditing() && canModify) {
            <button class="tab tab-add" (click)="addSnippet.emit()">
              <lucide-icon name="plus" [size]="14" [strokeWidth]="2"></lucide-icon>
              Add
            </button>
          }
        </div>
      }

      <!-- Monaco Editor Card -->
      <div class="editor-card">
        <div class="editor-toolbar">
          <div class="toolbar-left">
            <lucide-icon name="terminal" [size]="14" [strokeWidth]="2" class="toolbar-icon"></lucide-icon>
            <span class="toolbar-filename font-mono">
              {{ concept().title | lowercase }}.{{ currentSnippet()?.language ?? 'txt' }}
            </span>
          </div>
          <div class="toolbar-right">
            @if (isEditing()) {
              <span class="mode-badge mode-edit font-mono">EDIT</span>
            } @else {
              <span class="mode-badge mode-readonly font-mono">
                <lucide-icon name="eye" [size]="12" [strokeWidth]="2"></lucide-icon>
                READ-ONLY
              </span>
            }
          </div>
        </div>
        <app-monaco-editor
          [code]="displayedCode()"
          [language]="currentSnippet()?.language ?? 'plaintext'"
          [readOnly]="!isEditing()"
          (codeChange)="onCodeChange($event)"
        />
      </div>

      <!-- Template Variables -->
      @if (templateVariables().length > 0) {
        <div class="variables-section">
          <div class="variables-header">
            <lucide-icon name="variable" [size]="16" [strokeWidth]="2" class="var-icon"></lucide-icon>
            <h3 class="variables-title">Template Variables</h3>
            <span class="variables-hint">Fill in values to replace <code class="font-mono">{{ '{{VAR}}' }}</code> in copied code</span>
          </div>
          <div class="variables-grid">
            @for (variable of templateVariables(); track variable.name) {
              <div class="variable-field">
                <label class="variable-label font-mono">{{ '{{' + variable.name + '}}' }}</label>
                <input
                  type="text"
                  class="variable-input font-mono"
                  [placeholder]="variable.name"
                  [ngModel]="variable.value"
                  (ngModelChange)="updateVariable(variable.name, $event)"
                />
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .concept-editor {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      height: 100%;
    }

    /* Header */
    .editor-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }
    .header-left {
      flex: 1;
      min-width: 0;
    }
    .concept-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--foreground);
      margin-bottom: 0.25rem;
    }
    .concept-description {
      font-size: 0.875rem;
      color: var(--muted-foreground);
      margin-bottom: 0.5rem;
      line-height: 1.5;
    }
    .header-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .badge-language {
      font-size: 0.6875rem;
      padding: 0.1875rem 0.5rem;
      background: color-mix(in srgb, var(--primary) 12%, transparent);
      color: var(--primary);
      border-radius: var(--radius);
      text-transform: uppercase;
      font-weight: 500;
    }
    .badge-vars {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.6875rem;
      padding: 0.1875rem 0.5rem;
      background: color-mix(in srgb, var(--accent) 12%, transparent);
      color: var(--accent);
      border-radius: var(--radius);
      font-weight: 500;
    }
    .badge-visibility {
      font-size: 0.6875rem;
      padding: 0.1875rem 0.5rem;
      background: var(--secondary);
      color: var(--muted-foreground);
      border-radius: var(--radius);
      text-transform: uppercase;
      font-weight: 500;
    }

    /* Header Actions */
    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 0.875rem;
      border-radius: var(--radius);
      border: none;
      font-family: inherit;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.15s ease, opacity 0.15s ease;
      white-space: nowrap;
    }
    .btn:disabled {
      opacity: 0.7;
      cursor: default;
    }
    .btn-primary {
      background: var(--primary);
      color: var(--primary-foreground);
    }
    .btn-primary:hover:not(:disabled) {
      opacity: 0.9;
    }
    .btn-outline {
      background: transparent;
      color: var(--foreground);
      border: 1px solid var(--border);
    }
    .btn-outline:hover {
      background: var(--secondary);
    }
    .btn-ghost {
      background: transparent;
      color: var(--muted-foreground);
    }
    .btn-ghost:hover {
      background: var(--secondary);
      color: var(--foreground);
    }
    .btn-danger {
      background: transparent;
      color: var(--destructive);
      border: 1px solid var(--destructive);
    }
    .btn-danger:hover {
      background: var(--destructive);
      color: var(--destructive-foreground);
    }

    /* Language Tabs */
    .language-tabs {
      display: flex;
      gap: 0.25rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0;
    }
    .tab {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 0.875rem;
      border: none;
      background: transparent;
      color: var(--muted-foreground);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: color 0.15s ease, border-color 0.15s ease;
      text-transform: uppercase;
    }
    .tab:hover {
      color: var(--foreground);
    }
    .tab.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }
    .tab-add {
      color: var(--muted-foreground);
      opacity: 0.6;
    }
    .tab-add:hover {
      opacity: 1;
      color: var(--primary);
    }
    .tab-wrap {
      display: inline-flex;
      align-items: center;
      gap: 0.125rem;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
    }
    .tab-wrap.active {
      border-bottom-color: var(--primary);
    }
    .tab-wrap .tab {
      border-bottom: none;
      margin-bottom: 0;
    }
    .tab-delete {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.25rem;
      height: 1.25rem;
      border: none;
      background: transparent;
      color: var(--muted-foreground);
      border-radius: var(--radius);
      cursor: pointer;
      padding: 0;
      transition: color 0.15s ease, background-color 0.15s ease;
    }
    .tab-delete:hover {
      background: color-mix(in srgb, var(--destructive) 15%, transparent);
      color: var(--destructive);
    }

    /* Editor Card */
    .editor-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .editor-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: var(--secondary);
      border-bottom: 1px solid var(--border);
    }
    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .toolbar-icon {
      color: var(--primary);
    }
    .toolbar-filename {
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }
    .toolbar-right {
      display: flex;
      align-items: center;
    }
    .mode-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.625rem;
      padding: 0.125rem 0.5rem;
      border-radius: var(--radius);
      font-weight: 600;
      letter-spacing: 0.05em;
    }
    .mode-readonly {
      background: var(--secondary);
      color: var(--muted-foreground);
      border: 1px solid var(--border);
    }
    .mode-edit {
      background: color-mix(in srgb, var(--primary) 15%, transparent);
      color: var(--primary);
    }

    /* Template Variables */
    .variables-section {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1rem;
    }
    .variables-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .var-icon {
      color: var(--accent);
    }
    .variables-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--foreground);
    }
    .variables-hint {
      font-size: 0.75rem;
      color: var(--muted-foreground);
      margin-left: auto;
    }
    .variables-hint code {
      font-size: 0.6875rem;
      padding: 0.0625rem 0.25rem;
      background: var(--secondary);
      border-radius: 0.25rem;
    }
    .variables-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
      gap: 0.75rem;
    }
    .variable-field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .variable-label {
      font-size: 0.6875rem;
      color: var(--accent);
      font-weight: 500;
    }
    .variable-input {
      height: 2.25rem;
      padding: 0 0.625rem;
      background: var(--input-background);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--foreground);
      font-size: 0.8125rem;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .variable-input::placeholder {
      color: var(--muted-foreground);
      opacity: 0.5;
    }
    .variable-input:focus {
      border-color: var(--primary);
    }
  `],
})
export class ConceptEditorComponent {
  /** Signal input so that `computed()`s below react to selection changes. */
  readonly concept = input.required<Concept>();
  /** Language the user clicked in the sidebar; we select the matching snippet on change. */
  readonly preferredLanguage = input<string | null>(null);
  @Input() canModify = false;

  @Output() saveSnippet = new EventEmitter<{ snippetId: string; code: string }>();
  @Output() addSnippet = new EventEmitter<void>();
  @Output() deleteConcept = new EventEmitter<void>();
  @Output() deleteSnippet = new EventEmitter<Snippet>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly selectedSnippetIndex = signal(0);
  readonly isEditing = signal(false);
  readonly copySuccess = signal(false);
  private editedCode = '';
  readonly variableValues = signal<Map<string, string>>(new Map());

  constructor() {
    // Reset UI state whenever the concept or preferred language changes
    // (new selection from sidebar). If the user clicked a specific language
    // folder, pick that snippet; otherwise default to the first one.
    effect(() => {
      const concept = this.concept();
      const preferred = this.preferredLanguage();
      let idx = 0;
      if (preferred && concept.snippets?.length) {
        const match = concept.snippets.findIndex(
          s => s.language.toLowerCase() === preferred.toLowerCase(),
        );
        if (match >= 0) idx = match;
      }
      this.selectedSnippetIndex.set(idx);
      this.isEditing.set(false);
      this.variableValues.set(new Map());
    });
  }

  readonly currentSnippet = computed((): Snippet | null => {
    const concept = this.concept();
    const idx = this.selectedSnippetIndex();
    if (!concept?.snippets?.length) return null;
    return concept.snippets[idx] ?? concept.snippets[0] ?? null;
  });

  readonly currentCode = computed((): string => {
    const snippet = this.currentSnippet();
    return snippet?.code ?? '';
  });

  /**
   * Code shown in Monaco: raw (with {{VAR}}) while editing so the user edits
   * the source, or with variables substituted in read-only mode so they see
   * a live preview of what "Copy Code" will produce. Substitutions stay
   * client-side — nothing is persisted.
   */
  readonly displayedCode = computed((): string => {
    if (this.isEditing()) return this.currentCode();
    return this.applyVariables(this.currentCode());
  });

  readonly templateVariables = computed((): TemplateVariable[] => {
    const code = this.currentCode();
    if (!code) return [];
    const regex = /\{\{(\w+)\}\}/g;
    const names = new Set<string>();
    let match;
    while ((match = regex.exec(code)) !== null) {
      names.add(match[1]);
    }
    const vals = this.variableValues();
    return Array.from(names).map(name => ({
      name,
      value: vals.get(name) ?? '',
    }));
  });

  selectSnippet(index: number): void {
    this.selectedSnippetIndex.set(index);
    this.isEditing.set(false);
  }

  async confirmDeleteConcept(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const ok = await this.confirmDialog.confirm({
      title: `Delete concept "${this.concept().title}"?`,
      message: 'All snippets under this concept will be removed. This action cannot be undone.',
      confirmLabel: 'Delete concept',
      cancelLabel: 'Cancel',
      variant: 'destructive',
    });
    if (ok) this.deleteConcept.emit();
  }

  async confirmDeleteSnippet(snippet: Snippet): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const ok = await this.confirmDialog.confirm({
      title: `Delete the ${snippet.language} snippet?`,
      message: `This removes the ${snippet.language} variant from "${this.concept().title}". Other language snippets in this concept stay intact.`,
      confirmLabel: 'Delete snippet',
      cancelLabel: 'Cancel',
      variant: 'destructive',
    });
    if (ok) this.deleteSnippet.emit(snippet);
  }

  startEdit(): void {
    this.editedCode = this.currentCode();
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
  }

  onCodeChange(code: string): void {
    this.editedCode = code;
  }

  onSave(): void {
    const snippet = this.currentSnippet();
    if (snippet?.id) {
      this.saveSnippet.emit({ snippetId: snippet.id, code: this.editedCode });
    }
    this.isEditing.set(false);
  }

  updateVariable(name: string, value: string): void {
    const current = new Map(this.variableValues());
    current.set(name, value);
    this.variableValues.set(current);
  }

  /**
   * Replace every {{NAME}} placeholder with its user-entered value.
   * Unfilled variables are left as-is so the placeholder stays visible.
   */
  private applyVariables(source: string): string {
    if (!source) return source;
    let out = source;
    const vals = this.variableValues();
    for (const [name, value] of vals.entries()) {
      if (value) {
        out = out.replaceAll(`{{${name}}}`, value);
      }
    }
    return out;
  }

  async copyCode(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const code = this.applyVariables(this.currentCode());

    try {
      await navigator.clipboard.writeText(code);
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    }
  }
}
