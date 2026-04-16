import { Component, inject, signal, computed, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  Code,
  Plus,
  X,
  Trash2,
  AlertTriangle,
  BookOpen,
} from 'lucide-angular';
import { ConceptSidebarComponent } from './concept-sidebar.component';
import { ConceptEditorComponent } from './concept-editor.component';
import { ConceptService } from '../../core/services/concept.service';
import { AuthService } from '../../core/services/auth.service';
import {
  Concept,
  ConceptListItem,
  CreateConceptPayload,
  Snippet,
} from '../../core/models/concept.model';

const icons = { Code, Plus, X, Trash2, AlertTriangle, BookOpen };

@Component({
  selector: 'app-dev-library',
  imports: [
    AsyncPipe,
    FormsModule,
    LucideAngularModule,
    ConceptSidebarComponent,
    ConceptEditorComponent,
  ],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <div class="dev-library">
      <!-- Sidebar -->
      <app-concept-sidebar
        [concepts]="concepts()"
        [selectedConceptId]="selectedConcept()?.id ?? null"
        [canCreate]="!!(auth.isAuthenticated$ | async)"
        [isAuthenticated]="!!(auth.isAuthenticated$ | async)"
        (selectConcept)="onSelectConcept($event)"
        (createConcept)="openCreateDialog()"
      />

      <!-- Main Content -->
      <div class="main-content">
        @if (selectedConcept(); as concept) {
          <app-concept-editor
            [concept]="concept"
            [canModify]="canModifySelected()"
            (saveSnippet)="onSaveSnippet($event)"
            (addSnippet)="openAddSnippetDialog()"
            (deleteConcept)="onDeleteConcept()"
            (deleteSnippet)="onDeleteSnippet($event)"
          />
        } @else if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading concepts...</p>
          </div>
        } @else {
          <div class="empty-state">
            <div class="empty-icon-wrap">
              <lucide-icon name="book-open" [size]="48" [strokeWidth]="1.5" class="empty-icon"></lucide-icon>
            </div>
            <h2 class="empty-title">Dev Library</h2>
            <p class="empty-description">
              Select a concept from the sidebar to view its code snippets,
              or create a new concept to get started.
            </p>
            @if (auth.isAuthenticated$ | async) {
              <button class="btn btn-primary" (click)="openCreateDialog()">
                <lucide-icon name="plus" [size]="16" [strokeWidth]="2"></lucide-icon>
                New Concept
              </button>
            }
          </div>
        }
      </div>

      <!-- Create Concept Dialog -->
      @if (showCreateDialog()) {
        <div class="dialog-backdrop" (click)="closeCreateDialog()">
          <div class="dialog" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h3 class="dialog-title">
                <lucide-icon name="plus" [size]="18" [strokeWidth]="2"></lucide-icon>
                New Concept
              </h3>
              <button class="dialog-close" (click)="closeCreateDialog()">
                <lucide-icon name="x" [size]="18" [strokeWidth]="2"></lucide-icon>
              </button>
            </div>
            <div class="dialog-body">
              <div class="form-group">
                <label class="form-label">Title</label>
                <input
                  type="text"
                  class="form-input"
                  placeholder="e.g. Merge Sort"
                  [(ngModel)]="newConceptTitle"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Description</label>
                <textarea
                  class="form-textarea"
                  placeholder="Optional description..."
                  [(ngModel)]="newConceptDescription"
                  rows="3"
                ></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Visibility</label>
                <select class="form-select" [(ngModel)]="newConceptVisibility">
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">First Snippet — Language</label>
                <input
                  type="text"
                  class="form-input font-mono"
                  placeholder="e.g. python"
                  [(ngModel)]="newSnippetLanguage"
                />
              </div>
              <div class="form-group">
                <label class="form-label">First Snippet — Code</label>
                <textarea
                  class="form-textarea font-mono"
                  placeholder="// Your code here..."
                  [(ngModel)]="newSnippetCode"
                  rows="6"
                ></textarea>
              </div>
            </div>
            <div class="dialog-footer">
              <button class="btn btn-ghost" (click)="closeCreateDialog()">Cancel</button>
              <button
                class="btn btn-primary"
                [disabled]="!newConceptTitle.trim() || !newSnippetLanguage.trim()"
                (click)="createConcept()"
              >
                <lucide-icon name="plus" [size]="14" [strokeWidth]="2"></lucide-icon>
                Create
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Add Snippet Dialog -->
      @if (showAddSnippetDialog()) {
        <div class="dialog-backdrop" (click)="closeAddSnippetDialog()">
          <div class="dialog" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h3 class="dialog-title">
                <lucide-icon name="plus" [size]="18" [strokeWidth]="2"></lucide-icon>
                Add Snippet
              </h3>
              <button class="dialog-close" (click)="closeAddSnippetDialog()">
                <lucide-icon name="x" [size]="18" [strokeWidth]="2"></lucide-icon>
              </button>
            </div>
            <div class="dialog-body">
              <div class="form-group">
                <label class="form-label">Language</label>
                <input
                  type="text"
                  class="form-input font-mono"
                  placeholder="e.g. javascript"
                  [(ngModel)]="addSnippetLanguage"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Code</label>
                <textarea
                  class="form-textarea font-mono"
                  placeholder="// Your code here..."
                  [(ngModel)]="addSnippetCode"
                  rows="8"
                ></textarea>
              </div>
            </div>
            <div class="dialog-footer">
              <button class="btn btn-ghost" (click)="closeAddSnippetDialog()">Cancel</button>
              <button
                class="btn btn-primary"
                [disabled]="!addSnippetLanguage.trim()"
                (click)="addSnippet()"
              >
                <lucide-icon name="plus" [size]="14" [strokeWidth]="2"></lucide-icon>
                Add
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Error Toast -->
      @if (errorMessage()) {
        <div class="error-toast">
          <lucide-icon name="alert-triangle" [size]="16" [strokeWidth]="2"></lucide-icon>
          {{ errorMessage() }}
          <button class="toast-close" (click)="errorMessage.set('')">
            <lucide-icon name="x" [size]="14" [strokeWidth]="2"></lucide-icon>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .dev-library {
      display: flex;
      height: calc(100vh - 4rem - 3rem);
      margin: -1.5rem;
    }

    /* Main Content */
    .main-content {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      gap: 1rem;
    }
    .empty-icon-wrap {
      width: 5rem;
      height: 5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--primary) 10%, transparent);
      border-radius: 50%;
    }
    .empty-icon {
      color: var(--primary);
    }
    .empty-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--foreground);
    }
    .empty-description {
      font-size: 0.875rem;
      color: var(--muted-foreground);
      max-width: 24rem;
      line-height: 1.6;
    }

    /* Loading State */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 1rem;
      color: var(--muted-foreground);
      font-size: 0.875rem;
    }
    .spinner {
      width: 2rem;
      height: 2rem;
      border: 2px solid var(--border);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
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
      opacity: 0.5;
      cursor: default;
    }
    .btn-primary {
      background: var(--primary);
      color: var(--primary-foreground);
    }
    .btn-primary:hover:not(:disabled) {
      opacity: 0.9;
    }
    .btn-ghost {
      background: transparent;
      color: var(--muted-foreground);
    }
    .btn-ghost:hover {
      background: var(--secondary);
      color: var(--foreground);
    }

    /* Dialog */
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      backdrop-filter: blur(2px);
    }
    .dialog {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      width: 100%;
      max-width: 32rem;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border);
    }
    .dialog-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      color: var(--foreground);
    }
    .dialog-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border-radius: var(--radius);
      border: none;
      background: transparent;
      color: var(--muted-foreground);
      cursor: pointer;
    }
    .dialog-close:hover {
      background: var(--secondary);
      color: var(--foreground);
    }
    .dialog-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--border);
    }

    /* Form */
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .form-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--foreground);
    }
    .form-input,
    .form-select {
      height: 2.5rem;
      padding: 0 0.75rem;
      background: var(--input-background);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--foreground);
      font-size: 0.875rem;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .form-input:focus,
    .form-textarea:focus,
    .form-select:focus {
      border-color: var(--primary);
    }
    .form-input::placeholder,
    .form-textarea::placeholder {
      color: var(--muted-foreground);
    }
    .form-textarea {
      padding: 0.625rem 0.75rem;
      background: var(--input-background);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--foreground);
      font-size: 0.875rem;
      font-family: inherit;
      outline: none;
      resize: vertical;
      line-height: 1.5;
      transition: border-color 0.15s ease;
    }
    .form-select {
      cursor: pointer;
      appearance: auto;
    }

    /* Error Toast */
    .error-toast {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: var(--destructive);
      color: var(--destructive-foreground);
      border-radius: var(--radius);
      font-size: 0.8125rem;
      z-index: 200;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }
    .toast-close {
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      color: inherit;
      cursor: pointer;
      margin-left: 0.5rem;
      opacity: 0.7;
    }
    .toast-close:hover {
      opacity: 1;
    }
  `],
})
export class DevLibraryComponent implements OnInit {
  readonly conceptService = inject(ConceptService);
  readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly concepts = signal<ConceptListItem[]>([]);
  readonly selectedConcept = signal<Concept | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly showCreateDialog = signal(false);
  readonly showAddSnippetDialog = signal(false);

  // Create form fields
  newConceptTitle = '';
  newConceptDescription = '';
  newConceptVisibility: 'public' | 'private' = 'private';
  newSnippetLanguage = '';
  newSnippetCode = '';

  // Add snippet form fields
  addSnippetLanguage = '';
  addSnippetCode = '';

  // Reactive user state for ownership / admin checks
  private readonly currentUsername = signal<string | null>(null);
  private readonly isAdmin = signal(false);

  readonly canModifySelected = computed(() => {
    const concept = this.selectedConcept();
    if (!concept) return false;
    const username = this.currentUsername();
    if (username && concept.owner.username === username) return true;
    return this.isAdmin() && concept.visibility === 'public';
  });

  constructor() {
    this.auth.userData$.subscribe(user => {
      this.currentUsername.set(user?.username ?? null);
    });
    this.auth.isAdmin$.subscribe(isAdmin => {
      this.isAdmin.set(isAdmin);
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadConcepts();
    }
  }

  loadConcepts(): void {
    this.loading.set(true);
    this.conceptService.getConcepts().subscribe({
      next: (concepts) => {
        this.concepts.set(concepts);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load concepts', err);
        this.loading.set(false);
        // Don't show error for 401/403 — just means not authenticated
        if (err.status !== 401 && err.status !== 403) {
          this.showError('Failed to load concepts. Please try again.');
        }
      },
    });
  }

  onSelectConcept(item: ConceptListItem): void {
    this.loading.set(true);
    this.conceptService.getConcept(item.id).subscribe({
      next: (concept) => {
        this.selectedConcept.set(concept);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load concept', err);
        this.loading.set(false);
        this.showError('Failed to load concept details.');
      },
    });
  }

  onSaveSnippet(event: { snippetId: string; code: string }): void {
    this.conceptService.updateSnippet(event.snippetId, { code: event.code }).subscribe({
      next: () => {
        // Refresh the selected concept
        const concept = this.selectedConcept();
        if (concept) {
          this.conceptService.getConcept(concept.id).subscribe({
            next: (updated) => this.selectedConcept.set(updated),
          });
        }
      },
      error: () => {
        this.showError('Failed to save snippet.');
      },
    });
  }

  openCreateDialog(): void {
    this.newConceptTitle = '';
    this.newConceptDescription = '';
    this.newConceptVisibility = 'private';
    this.newSnippetLanguage = '';
    this.newSnippetCode = '// Your code here...';
    this.showCreateDialog.set(true);
  }

  closeCreateDialog(): void {
    this.showCreateDialog.set(false);
  }

  createConcept(): void {
    if (!this.newConceptTitle.trim() || !this.newSnippetLanguage.trim()) return;

    const payload: CreateConceptPayload = {
      title: this.newConceptTitle.trim(),
      description: this.newConceptDescription.trim() || undefined,
      visibility: this.newConceptVisibility,
      snippets: [
        {
          language: this.newSnippetLanguage.trim().toLowerCase(),
          code: this.newSnippetCode || '',
          sortOrder: 0,
        },
      ],
    };

    this.conceptService.createConcept(payload).subscribe({
      next: (concept) => {
        this.closeCreateDialog();
        this.loadConcepts();
        this.selectedConcept.set(concept);
      },
      error: () => {
        this.showError('Failed to create concept.');
      },
    });
  }

  openAddSnippetDialog(): void {
    this.addSnippetLanguage = '';
    this.addSnippetCode = '// Your code here...';
    this.showAddSnippetDialog.set(true);
  }

  closeAddSnippetDialog(): void {
    this.showAddSnippetDialog.set(false);
  }

  addSnippet(): void {
    const concept = this.selectedConcept();
    if (!concept || !this.addSnippetLanguage.trim()) return;

    const sortOrder = concept.snippets.length;
    this.conceptService.addSnippet(concept.id, {
      language: this.addSnippetLanguage.trim().toLowerCase(),
      code: this.addSnippetCode || '',
      sortOrder,
    }).subscribe({
      next: () => {
        this.closeAddSnippetDialog();
        // Refresh concept
        this.conceptService.getConcept(concept.id).subscribe({
          next: (updated) => {
            this.selectedConcept.set(updated);
            this.loadConcepts();
          },
        });
      },
      error: () => {
        this.showError('Failed to add snippet.');
      },
    });
  }

  onDeleteConcept(): void {
    const concept = this.selectedConcept();
    if (!concept) return;
    this.conceptService.deleteConcept(concept.id).subscribe({
      next: () => {
        this.selectedConcept.set(null);
        this.loadConcepts();
      },
      error: () => {
        this.showError('Failed to delete concept.');
      },
    });
  }

  onDeleteSnippet(snippet: Snippet): void {
    if (!snippet.id) return;
    const concept = this.selectedConcept();
    if (!concept) return;
    this.conceptService.deleteSnippet(snippet.id).subscribe({
      next: () => {
        // Refresh the selected concept
        this.conceptService.getConcept(concept.id).subscribe({
          next: (updated) => {
            this.selectedConcept.set(updated);
            this.loadConcepts();
          },
        });
      },
      error: () => {
        this.showError('Failed to delete snippet.');
      },
    });
  }

  private showError(message: string): void {
    this.errorMessage.set(message);
    setTimeout(() => this.errorMessage.set(''), 5000);
  }
}
