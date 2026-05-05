import { Component, inject, signal, computed, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
  Users,
} from 'lucide-angular';
import { ConceptSidebarComponent } from './concept-sidebar.component';
import { ConceptEditorComponent, ConceptEditPayload } from './concept-editor.component';
import { TagInputComponent } from '../../shared/components/tag-input/tag-input.component';
import { ConceptService } from '../../core/services/concept.service';
import { SeoService } from '../../core/services/seo.service';
import { AuthService } from '../../core/services/auth.service';
import { TeamService } from '../../core/services/team.service';
import {
  Concept,
  ConceptListItem,
  CreateConceptPayload,
  Snippet,
  UpdateConceptPayload,
} from '../../core/models/concept.model';
import { TeamSummary } from '../../core/models/team.model';

const icons = { Code, Plus, X, Trash2, AlertTriangle, BookOpen, Users };

@Component({
  selector: 'app-dev-library',
  imports: [
    AsyncPipe,
    FormsModule,
    LucideAngularModule,
    ConceptSidebarComponent,
    ConceptEditorComponent,
    TagInputComponent,
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
            [preferredLanguage]="preferredLanguage()"
            [canModify]="canModifySelected()"
            [sharedTeams]="sharedTeamsView()"
            [availableTeams]="teams()"
            (saveConcept)="onSaveConcept($event)"
            (addSnippet)="openAddSnippetDialog()"
            (deleteConcept)="onDeleteConcept()"
            (deleteSnippet)="onDeleteSnippet($event)"
            (unshareTeam)="onUnshareTeamFromConcept($event)"
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
                  <option value="team" [disabled]="teams().length === 0">Team</option>
                </select>
                @if (newConceptVisibility === 'team' && teams().length === 0) {
                  <p class="form-hint form-hint-warn">
                    You are not a member of any team yet. Create or join a team first.
                  </p>
                }
              </div>
              @if (newConceptVisibility === 'team' && teams().length > 0) {
                <div class="form-group">
                  <label class="form-label">
                    <lucide-icon name="users" [size]="14" [strokeWidth]="2"></lucide-icon>
                    Share with teams
                  </label>
                  <div class="team-picker">
                    @for (team of teams(); track team.id) {
                      <label class="team-option">
                        <input
                          type="checkbox"
                          [checked]="newConceptTeamIds.has(team.id)"
                          (change)="toggleNewConceptTeam(team.id, $event)"
                        />
                        <span class="team-option-name">{{ team.name }}</span>
                        <span class="team-option-meta font-mono">
                          {{ team.memberCount }} {{ team.memberCount === 1 ? 'member' : 'members' }}
                          @if (team.role === 'lead') {
                            · LEAD
                          }
                        </span>
                      </label>
                    }
                  </div>
                  @if (newConceptTeamIds.size === 0) {
                    <p class="form-hint form-hint-error">
                      Select at least one team to share with.
                    </p>
                  }
                </div>
              }
              <div class="form-group">
                <label class="form-label">Tags</label>
                <app-tag-input
                  [tags]="newConceptTags()"
                  placeholder="Add tags…"
                  (tagsChange)="newConceptTags.set($event)"
                />
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
                [disabled]="!canSubmitNewConcept()"
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
      height: calc(100dvh - 4rem - 3rem);
      margin: -1.5rem;
    }

    /* Main Content */
    .main-content {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem 1.5rem 3rem;
      min-width: 0;
      min-height: 0;
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
    .form-hint {
      font-size: 0.75rem;
      color: var(--muted-foreground);
      margin: 0;
    }
    .form-hint-error {
      color: var(--destructive);
    }
    .form-hint-warn {
      color: var(--muted-foreground);
      font-style: italic;
    }

    /* Team picker (multi-select via checkboxes) */
    .team-picker {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      max-height: 12rem;
      overflow-y: auto;
      padding: 0.375rem;
      background: var(--input-background);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }
    .team-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.5rem;
      border-radius: calc(var(--radius) - 2px);
      cursor: pointer;
      color: var(--foreground);
      font-size: 0.8125rem;
      transition: background-color 0.15s ease;
    }
    .team-option:hover {
      background: var(--secondary);
    }
    .team-option input[type='checkbox'] {
      accent-color: var(--primary);
      cursor: pointer;
    }
    .team-option-name {
      flex: 1;
      font-weight: 500;
    }
    .team-option-meta {
      font-size: 0.6875rem;
      color: var(--muted-foreground);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    /* Shared teams on the editor */
    .shared-teams-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-left: 3px solid var(--primary);
      border-radius: var(--radius);
      padding: 1rem 1.25rem;
    }
    .shared-teams-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .shared-teams-icon {
      color: var(--primary);
    }
    .shared-teams-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--primary);
      letter-spacing: 0.08em;
      margin: 0;
      text-transform: uppercase;
    }
    .shared-teams-hint {
      font-size: 0.75rem;
      color: var(--muted-foreground);
      margin-left: auto;
    }
    .shared-teams-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .shared-team-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.5rem 0.25rem 0.625rem;
      background: color-mix(in srgb, var(--primary) 10%, transparent);
      color: var(--primary);
      border-radius: var(--radius);
      font-size: 0.75rem;
      font-weight: 500;
    }
    .shared-team-chip-unshare {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1rem;
      height: 1rem;
      border-radius: 50%;
      border: none;
      background: transparent;
      color: currentColor;
      cursor: pointer;
      opacity: 0.7;
      padding: 0;
      transition: background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
    }
    .shared-team-chip-unshare:hover {
      background: var(--destructive);
      color: var(--destructive-foreground);
      opacity: 1;
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

    /* ---- Responsive ---- */
    @media (max-width: 768px) {
      .dev-library {
        flex-direction: column;
        height: auto;
        min-height: calc(100dvh - 3.25rem - 2rem);
        margin: -1rem -0.75rem;
      }
      .main-content {
        padding: 1rem 0.75rem;
      }
      .dialog {
        padding: 1.25rem 0.5rem;
      }
      .dialog-card {
        max-width: 100%;
        padding: 1rem;
        max-height: 90vh;
      }
    }
    @media (max-width: 560px) {
      .meta-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class DevLibraryComponent implements OnInit {
  readonly conceptService = inject(ConceptService);
  readonly auth = inject(AuthService);
  readonly teamService = inject(TeamService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);

  readonly concepts = signal<ConceptListItem[]>([]);
  readonly selectedConcept = signal<Concept | null>(null);
  /** Language the user clicked in the sidebar (null = fallback to first snippet). */
  readonly preferredLanguage = signal<string | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly showCreateDialog = signal(false);
  readonly showAddSnippetDialog = signal(false);
  /** Teams the current user belongs to, used for the sharing multi-select. */
  readonly teams = signal<TeamSummary[]>([]);

  // Create form fields
  newConceptTitle = '';
  newConceptDescription = '';
  newConceptVisibility: 'public' | 'private' | 'team' = 'private';
  /** Chosen team IDs for the create dialog when visibility='team'. */
  newConceptTeamIds = new Set<string>();
  readonly newConceptTags = signal<string[]>([]);
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

  /**
   * IDs of teams the current user leads, computed from the teams list.
   * Used to decide whether to show per-team "unshare" buttons on a concept
   * whose owner is someone else but which is shared with a team we lead.
   */
  readonly myLeadTeamIds = computed(() => {
    const ids = new Set<string>();
    for (const t of this.teams()) {
      if (t.role === 'lead') ids.add(t.id);
    }
    return ids;
  });

  /**
   * Visible shared teams on the detail view + whether each can be unshared by
   * the current user. Rule: the concept owner can unshare any team; a team's
   * lead can unshare their own team.
   */
  readonly sharedTeamsView = computed(() => {
    const concept = this.selectedConcept();
    if (!concept || concept.visibility !== 'team') return [];
    const teams = concept.sharedTeams ?? [];
    if (teams.length === 0) return [];
    const isOwner = this.canModifySelected();
    const leadIds = this.myLeadTeamIds();
    return teams.map(t => ({
      id: t.id,
      name: t.name,
      canUnshare: isOwner || leadIds.has(t.id),
    }));
  });

  /**
   * Valid form state for the create dialog. When visibility='team', at least
   * one team must be selected — mirrors the backend constraint.
   * Plain getter (not a computed) since the form fields are plain class
   * properties driven by `[(ngModel)]`, which triggers Angular's change
   * detection directly on the template.
   */
  canSubmitNewConcept(): boolean {
    if (!this.newConceptTitle.trim() || !this.newSnippetLanguage.trim()) return false;
    if (this.newConceptVisibility === 'team' && this.newConceptTeamIds.size === 0) return false;
    return true;
  }

  constructor() {
    this.auth.userData$.subscribe(user => {
      this.currentUsername.set(user?.username ?? null);
    });
    this.auth.isAdmin$.subscribe(isAdmin => {
      this.isAdmin.set(isAdmin);
    });
    // Refresh the teams list whenever auth status changes so the sharing
    // multi-select and the "unshare" buttons react to login/logout.
    this.auth.isAuthenticated$.subscribe(isAuth => {
      if (isAuth) this.loadTeams();
      else this.teams.set([]);
    });
  }

  ngOnInit(): void {
    this.seo.apply({
      title: 'Dev Library — Snippets cybersec multi-langages',
      description: 'Bibliothèque collaborative de snippets cybersécurité : exploits, scripts pentest, code défensif. Multi-langages avec templating de variables côté navigateur.',
    });
    if (isPlatformBrowser(this.platformId)) {
      this.loadConcepts();
      this.route.queryParamMap.subscribe(pm => {
        const qpId = pm.get('concept');
        if (!qpId) return;
        if (this.selectedConcept()?.id === qpId) return;
        const found = this.concepts().find(c => c.id === qpId);
        if (found) this.onSelectConcept({ concept: found, language: found.languages[0] || '' });
      });
    }
  }

  private loadTeams(): void {
    this.teamService.list().subscribe({
      next: teams => this.teams.set(teams),
      error: () => {
        /* silent — sharing simply won't be available until teams load */
      },
    });
  }

  loadConcepts(): void {
    this.loading.set(true);
    this.conceptService.getConcepts().subscribe({
      next: (concepts) => {
        this.concepts.set(concepts);
        this.loading.set(false);
        // Deep-link: auto-select concept from ?concept=ID query param
        const qpId = this.route.snapshot.queryParamMap.get('concept');
        if (qpId && !this.selectedConcept()) {
          const found = concepts.find(c => c.id === qpId);
          if (found) {
            this.onSelectConcept({ concept: found, language: found.languages[0] || '' });
          }
        }
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

  onSelectConcept(event: { concept: ConceptListItem; language: string }): void {
    this.preferredLanguage.set(event.language);
    this.loading.set(true);
    this.conceptService.getConcept(event.concept.id).subscribe({
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

  /**
   * Save the concept's metadata (title/description/visibility/tags/teams)
   * plus the currently-open snippet's code in a single Save action. The
   * metadata update always runs; the snippet update only when we have a
   * snippet id + a code field (otherwise it's a new concept with no snippet
   * yet, which shouldn't reach this path).
   */
  onSaveConcept(event: ConceptEditPayload): void {
    const concept = this.selectedConcept();
    if (!concept) return;

    const metadata: UpdateConceptPayload = {
      title: event.title,
      description: event.description ?? undefined,
      visibility: event.visibility,
      tags: event.tags,
    };
    if (event.visibility === 'team') {
      metadata.sharedTeamIds = event.sharedTeamIds ?? [];
    }

    this.conceptService.updateConcept(concept.id, metadata).subscribe({
      next: () => {
        // If a snippet body change was included, push it next.
        if (event.snippetId && event.code !== undefined) {
          this.conceptService.updateSnippet(event.snippetId, { code: event.code }).subscribe({
            next: () => this.refreshSelected(concept.id),
            error: () => this.showError('Failed to save snippet.'),
          });
        } else {
          this.refreshSelected(concept.id);
        }
      },
      error: () => this.showError('Failed to save concept.'),
    });
  }

  /** Refetch the currently-selected concept + the list (both can have changed). */
  private refreshSelected(id: string): void {
    this.conceptService.getConcept(id).subscribe({
      next: (updated) => {
        this.selectedConcept.set(updated);
        this.loadConcepts();
      },
      error: () => {
        // Lost read access (e.g. made it private from a team we don't own).
        this.selectedConcept.set(null);
        this.loadConcepts();
      },
    });
  }

  openCreateDialog(): void {
    this.newConceptTitle = '';
    this.newConceptDescription = '';
    this.newConceptVisibility = 'private';
    this.newConceptTeamIds = new Set<string>();
    this.newConceptTags.set([]);
    this.newSnippetLanguage = '';
    this.newSnippetCode = '// Your code here...';
    // Make sure the teams list is fresh when the dialog opens — the user
    // might have created a team since the last page load.
    this.loadTeams();
    this.showCreateDialog.set(true);
  }

  closeCreateDialog(): void {
    this.showCreateDialog.set(false);
  }

  /** Toggle a team's checkbox in the create dialog's multi-select. */
  toggleNewConceptTeam(teamId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set(this.newConceptTeamIds);
    if (checked) next.add(teamId);
    else next.delete(teamId);
    this.newConceptTeamIds = next;
  }

  createConcept(): void {
    if (!this.canSubmitNewConcept()) return;

    const payload: CreateConceptPayload = {
      title: this.newConceptTitle.trim(),
      description: this.newConceptDescription.trim() || undefined,
      visibility: this.newConceptVisibility,
      tags: this.newConceptTags(),
      snippets: [
        {
          language: this.newSnippetLanguage.trim().toLowerCase(),
          code: this.newSnippetCode || '',
          sortOrder: 0,
        },
      ],
    };

    // Only include sharedTeamIds when visibility='team' — the backend rejects
    // a non-empty array for public/private (and an empty array for team).
    if (this.newConceptVisibility === 'team') {
      payload.sharedTeamIds = Array.from(this.newConceptTeamIds);
    }

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

  /**
   * Unshare the current concept from a single team. The server performs the
   * soft-unshare + auto-flip-to-private when it was the last team. We then
   * refetch the concept so the badges + shared list update.
   */
  onUnshareTeamFromConcept(teamId: string): void {
    const concept = this.selectedConcept();
    if (!concept) return;
    this.conceptService.unshareFromTeam(concept.id, teamId).subscribe({
      next: () => {
        this.conceptService.getConcept(concept.id).subscribe({
          next: (updated) => {
            this.selectedConcept.set(updated);
            this.loadConcepts();
          },
          error: () => {
            // If we lose read access after unshare (e.g. we were a lead-only
            // viewer), drop the detail selection and refresh the list.
            this.selectedConcept.set(null);
            this.loadConcepts();
          },
        });
      },
      error: () => this.showError('Failed to unshare concept from team.'),
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
