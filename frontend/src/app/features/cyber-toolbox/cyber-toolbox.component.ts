import {
  Component,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Edit3,
  FileCode,
  Flag,
  Folder,
  Lock,
  Plus,
  Save,
  Search,
  Shield,
  Terminal,
  Trash2,
  Users,
  Variable,
  Wrench,
  X,
} from 'lucide-angular';
import { MonacoEditorComponent } from '../../shared/components/monaco-editor/monaco-editor.component';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ReportDialogComponent } from '../../shared/components/report-dialog/report-dialog.component';
import { TagInputComponent } from '../../shared/components/tag-input/tag-input.component';
import { TagPillComponent } from '../../shared/components/tag-pill/tag-pill.component';
import { AuthService } from '../../core/services/auth.service';
import { PayloadService } from '../../core/services/payload.service';
import { TeamService } from '../../core/services/team.service';
import {
  Payload,
  PayloadCategory,
  PayloadCreateInput,
  PayloadListItem,
  PayloadUpdateInput,
  PayloadVisibility,
} from '../../core/models/payload.model';
import { TeamSummary } from '../../core/models/team.model';

const icons = {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Edit3,
  FileCode,
  Flag,
  Folder,
  Lock,
  Plus,
  Save,
  Search,
  Shield,
  Terminal,
  Trash2,
  Users,
  Variable,
  Wrench,
  X,
};

interface TemplateVariable {
  name: string;
  value: string;
}

interface CategoryMeta {
  key: PayloadCategory;
  label: string;
}

const CATEGORIES: CategoryMeta[] = [
  { key: 'recon', label: 'Reconnaissance' },
  { key: 'exploitation', label: 'Exploitation' },
  { key: 'privesc', label: 'Privilege Escalation' },
  { key: 'post-exploitation', label: 'Post-Exploitation' },
  { key: 'defense', label: 'Defense' },
  { key: 'other', label: 'Other' },
];

@Component({
  selector: 'app-cyber-toolbox',
  imports: [AsyncPipe, FormsModule, LucideAngularModule, MonacoEditorComponent, ReportDialogComponent, TagInputComponent, TagPillComponent],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <div class="cyber-toolbox">
      <!-- Sidebar -->
      <aside class="ctb-sidebar">
        <div class="sidebar-header">
          <h2 class="sidebar-title">
            <lucide-icon name="wrench" [size]="18" [strokeWidth]="2"></lucide-icon>
            Cyber Toolbox
          </h2>
          @if (auth.isAuthenticated$ | async) {
            <button class="btn-new" (click)="openCreateDialog()" title="New payload">
              <lucide-icon name="plus" [size]="16" [strokeWidth]="2"></lucide-icon>
            </button>
          }
        </div>

        <div class="sidebar-search">
          <lucide-icon name="search" [size]="14" [strokeWidth]="2" class="search-icon"></lucide-icon>
          <input
            type="text"
            class="search-input font-mono"
            placeholder="Filter (title, lang, tag)..."
            [ngModel]="filterText()"
            (ngModelChange)="filterText.set($event)"
          />
        </div>

        @if (auth.isAuthenticated$ | async) {
          <div class="sidebar-visibility-toggle">
            <button
              class="vis-btn"
              [class.active]="!privateOnly()"
              (click)="privateOnly.set(false)"
              title="All payloads"
            >All</button>
            <button
              class="vis-btn"
              [class.active]="privateOnly()"
              (click)="privateOnly.set(true)"
              title="Only my private payloads"
            >
              <lucide-icon name="lock" [size]="12" [strokeWidth]="2"></lucide-icon>
              Private
            </button>
          </div>
        }

        <div class="sidebar-tree">
          @if (filteredGroups().length === 0) {
            <div class="empty-tree">
              <lucide-icon name="folder" [size]="28" [strokeWidth]="1.5" class="empty-icon"></lucide-icon>
              <p class="empty-text">No payloads match</p>
            </div>
          }

          @for (group of filteredGroups(); track group.key) {
            <div class="tree-group">
              <button class="tree-folder" (click)="toggleCategory(group.key)">
                @if (expandedCategories().has(group.key)) {
                  <lucide-icon name="chevron-down" [size]="14" [strokeWidth]="2"></lucide-icon>
                } @else {
                  <lucide-icon name="chevron-right" [size]="14" [strokeWidth]="2"></lucide-icon>
                }
                <lucide-icon name="folder" [size]="14" [strokeWidth]="2" class="folder-icon"></lucide-icon>
                <span class="folder-name">{{ group.label }}</span>
                <span class="folder-count">{{ group.items.length }}</span>
              </button>

              @if (expandedCategories().has(group.key)) {
                <div class="tree-items">
                  @for (item of group.items; track item.id) {
                    <button
                      class="tree-item"
                      [class.active]="selected()?.id === item.id"
                      (click)="onSelectPayload(item)"
                    >
                      <lucide-icon name="file-code" [size]="14" [strokeWidth]="2" class="item-icon"></lucide-icon>
                      <span class="item-name">{{ item.title }}</span>
                      <span
                        class="item-vis font-mono"
                        [class.is-private]="item.visibility === 'private'"
                        [class.is-team]="item.visibility === 'team'"
                      >{{ item.visibility === 'private' ? 'PRIV' : (item.visibility === 'team' ? 'TEAM' : 'PUB') }}</span>
                    </button>
                  }
                </div>
              }
            </div>
          }
        </div>
      </aside>

      <!-- Main -->
      <div class="main-content">
        @if (selected(); as p) {
          <!-- Header card with red rail -->
          <div class="header-card">
            <div class="header-top">
              <div class="header-left">
                <h1 class="payload-title">{{ p.title }}</h1>
                @if (p.description) {
                  <p class="payload-description">{{ p.description }}</p>
                }
                <div class="header-meta">
                  <span class="pill pill-category font-mono">{{ categoryLabel(p.category) }}</span>
                  @if (p.language) {
                    <span class="pill pill-language font-mono">{{ p.language }}</span>
                  }
                  <span
                    class="pill pill-visibility font-mono"
                    [class.is-private]="p.visibility === 'private'"
                    [class.is-team]="p.visibility === 'team'"
                  >{{ p.visibility.toUpperCase() }}</span>
                  <span class="pill pill-owner font-mono">
                    @{{ p.owner.username }}
                  </span>
                  @for (tag of p.tags; track tag.id) {
                    <app-tag-pill [name]="tag.name" [isOfficial]="!!tag.isOfficial" />
                  }
                </div>
              </div>
              <div class="header-actions">
                @if (canModifySelected()) {
                  @if (isEditing()) {
                    <button class="btn btn-primary" [disabled]="!canSaveEdits()" (click)="onSaveEdits()">
                      <lucide-icon name="save" [size]="14" [strokeWidth]="2"></lucide-icon>
                      Save
                    </button>
                    <button class="btn btn-ghost" (click)="cancelEdit()">Cancel</button>
                  } @else {
                    <button class="btn btn-outline" (click)="startEdit()">
                      <lucide-icon name="edit-3" [size]="14" [strokeWidth]="2"></lucide-icon>
                      Edit
                    </button>
                    <button class="btn btn-danger" (click)="confirmDelete()">
                      <lucide-icon name="trash-2" [size]="14" [strokeWidth]="2"></lucide-icon>
                      Delete
                    </button>
                  }
                } @else if (p.visibility === 'public') {
                  <button
                    class="btn btn-report"
                    type="button"
                    (click)="openReportDialog()"
                    title="Signaler ce payload"
                  >
                    <lucide-icon name="flag" [size]="14" [strokeWidth]="2"></lucide-icon>
                    Signaler
                  </button>
                }
                <button class="btn btn-primary" (click)="copyBody()" [disabled]="copySuccess()">
                  @if (copySuccess()) {
                    <lucide-icon name="check" [size]="14" [strokeWidth]="2"></lucide-icon>
                    Copied!
                  } @else {
                    <lucide-icon name="copy" [size]="14" [strokeWidth]="2"></lucide-icon>
                    Copy
                  }
                </button>
              </div>
            </div>
          </div>

          <!-- Shared Teams (visibility='team') -->
          @if (p.visibility === 'team' && sharedTeamsView().length > 0) {
            <div class="shared-teams-card">
              <div class="shared-teams-header">
                <lucide-icon name="users" [size]="14" [strokeWidth]="2" class="shared-teams-icon"></lucide-icon>
                <h3 class="shared-teams-title font-mono">SHARED WITH</h3>
                <span class="shared-teams-hint">
                  Team leads can unshare their team. Unsharing the last team flips this payload back to private.
                </span>
              </div>
              <div class="shared-teams-list">
                @for (team of sharedTeamsView(); track team.id) {
                  <span class="shared-team-chip">
                    <lucide-icon name="users" [size]="11" [strokeWidth]="2"></lucide-icon>
                    {{ team.name }}
                    @if (team.canUnshare) {
                      <button
                        class="shared-team-chip-unshare"
                        (click)="confirmUnshareTeam(team)"
                        [title]="'Unshare from ' + team.name"
                      >
                        <lucide-icon name="x" [size]="10" [strokeWidth]="2.5"></lucide-icon>
                      </button>
                    }
                  </span>
                }
              </div>
            </div>
          }

          <!-- Monaco card -->
          <div class="editor-card">
            <div class="editor-toolbar">
              <div class="toolbar-left">
                <lucide-icon name="terminal" [size]="14" [strokeWidth]="2" class="toolbar-icon"></lucide-icon>
                <span class="toolbar-filename font-mono">
                  payload.{{ p.language || 'sh' }}
                </span>
              </div>
              <div class="toolbar-right">
                @if (isEditing()) {
                  <span class="mode-badge mode-edit font-mono">EDIT</span>
                } @else {
                  <span class="mode-badge mode-readonly font-mono">READ-ONLY</span>
                }
                <span class="mode-badge mode-enc font-mono" title="Stored AES-256 encrypted server-side">
                  <lucide-icon name="shield" [size]="11" [strokeWidth]="2"></lucide-icon>
                  AES-256
                </span>
              </div>
            </div>
            <app-monaco-editor
              [code]="displayedBody()"
              [language]="p.language || 'shell'"
              [readOnly]="!isEditing()"
              (codeChange)="onBodyChange($event)"
            />
          </div>

          <!-- Template Variables -->
          @if (templateVariables().length > 0) {
            <div class="vars-card">
              <div class="vars-header">
                <lucide-icon name="variable" [size]="14" [strokeWidth]="2" class="vars-icon"></lucide-icon>
                <h3 class="vars-title font-mono">TEMPLATE VARIABLES</h3>
                <span class="vars-count font-mono">{{ templateVariables().length }}</span>
                <span class="vars-hint">
                  Fill values to replace <code class="font-mono">{{ '{{VAR}}' }}</code> live in the preview + Copy output
                </span>
              </div>
              <div class="vars-grid">
                @for (variable of templateVariables(); track variable.name) {
                  <div class="var-field">
                    <label class="var-label font-mono">{{ '{{' + variable.name + '}}' }}</label>
                    <input
                      type="text"
                      class="var-input font-mono"
                      [placeholder]="variable.name"
                      [ngModel]="variable.value"
                      (ngModelChange)="updateVariable(variable.name, $event)"
                    />
                  </div>
                }
              </div>
            </div>
          }

          <!-- Edit metadata (visible only in edit mode) -->
          @if (isEditing()) {
            <div class="meta-edit-card">
              <h3 class="meta-edit-title font-mono">PAYLOAD METADATA</h3>
              <div class="meta-grid">
                <div class="form-group">
                  <label class="form-label font-mono">TITLE</label>
                  <input class="form-input" type="text" [(ngModel)]="editTitle" />
                </div>
                <div class="form-group">
                  <label class="form-label font-mono">LANGUAGE</label>
                  <input class="form-input font-mono" type="text" placeholder="e.g. bash, python, powershell" [(ngModel)]="editLanguage" />
                </div>
                <div class="form-group">
                  <label class="form-label font-mono">CATEGORY</label>
                  <select class="form-select" [(ngModel)]="editCategory">
                    @for (cat of categories; track cat.key) {
                      <option [value]="cat.key">{{ cat.label }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label font-mono">VISIBILITY</label>
                  <select class="form-select" [(ngModel)]="editVisibility">
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                    <option value="team" [disabled]="teams().length === 0">Team</option>
                  </select>
                </div>
                <div class="form-group form-group-span">
                  <label class="form-label font-mono">DESCRIPTION</label>
                  <textarea class="form-textarea" rows="2" [(ngModel)]="editDescription"></textarea>
                </div>
                <div class="form-group form-group-span">
                  <label class="form-label font-mono">TAGS</label>
                  <app-tag-input
                    [tags]="editTags()"
                    placeholder="Add tags…"
                    (tagsChange)="editTags.set($event)"
                  />
                </div>
                @if (editVisibility === 'team') {
                  <div class="form-group form-group-span">
                    <label class="form-label font-mono">
                      <lucide-icon name="users" [size]="12" [strokeWidth]="2"></lucide-icon>
                      SHARE WITH TEAMS
                    </label>
                    @if (teams().length === 0) {
                      <p class="form-hint form-hint-warn">You are not a member of any team yet.</p>
                    } @else {
                      <div class="team-picker">
                        @for (team of teams(); track team.id) {
                          <label class="team-option">
                            <input
                              type="checkbox"
                              [checked]="editTeamIds.has(team.id)"
                              (change)="toggleEditTeam(team.id, $event)"
                            />
                            <span class="team-option-name">{{ team.name }}</span>
                            <span class="team-option-meta font-mono">
                              {{ team.memberCount }} {{ team.memberCount === 1 ? 'member' : 'members' }}
                              @if (team.role === 'lead') { · LEAD }
                            </span>
                          </label>
                        }
                      </div>
                      @if (editTeamIds.size === 0) {
                        <p class="form-hint form-hint-error">
                          Select at least one team to share with.
                        </p>
                      }
                    }
                  </div>
                }
              </div>
            </div>
          }
        } @else if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading payloads...</p>
          </div>
        } @else if (payloads().length === 0 && !(auth.isAuthenticated$ | async)) {
          <div class="empty-state">
            <div class="empty-icon-wrap">
              <lucide-icon name="lock" [size]="42" [strokeWidth]="1.5" class="empty-icon"></lucide-icon>
            </div>
            <h2 class="empty-title font-mono">SIGN IN REQUIRED</h2>
            <p class="empty-description">
              Sign in to manage your cyber toolbox. Public payloads remain visible for everyone.
            </p>
            <button class="btn btn-primary" (click)="auth.login()">Sign in</button>
          </div>
        } @else if (payloads().length === 0) {
          <div class="empty-state">
            <div class="empty-icon-wrap">
              <lucide-icon name="wrench" [size]="42" [strokeWidth]="1.5" class="empty-icon"></lucide-icon>
            </div>
            <h2 class="empty-title font-mono">NO PAYLOADS YET</h2>
            <p class="empty-description">
              Start building your offensive/defensive toolbox. All payload bodies are encrypted
              with AES-256 before being stored on the server.
            </p>
            <button class="btn btn-primary" (click)="openCreateDialog()">
              <lucide-icon name="plus" [size]="14" [strokeWidth]="2"></lucide-icon>
              Create your first entry
            </button>
          </div>
        } @else {
          <div class="empty-state">
            <div class="empty-icon-wrap">
              <lucide-icon name="wrench" [size]="42" [strokeWidth]="1.5" class="empty-icon"></lucide-icon>
            </div>
            <h2 class="empty-title font-mono">SELECT A PAYLOAD</h2>
            <p class="empty-description">
              Pick one from the sidebar to preview and manage it.
            </p>
          </div>
        }

        <!-- Security notice -->
        <div class="security-notice">
          <lucide-icon name="alert-triangle" [size]="18" [strokeWidth]="2" class="notice-icon"></lucide-icon>
          <div class="notice-body">
            <h4 class="notice-title font-mono">SERVER-SIDE ENCRYPTION</h4>
            <p class="notice-text">
              Payload bodies are encrypted with <strong>AES-256-GCM</strong> and base64-encoded
              before they touch PostgreSQL, so an AV scanning the host filesystem never sees
              plaintext offensive code. Meilisearch only indexes metadata (title, description, tags,
              language) — never the payload body.
            </p>
          </div>
        </div>
      </div>

      <!-- Create Dialog -->
      @if (showCreateDialog()) {
        <div class="dialog-backdrop" (click)="closeCreateDialog()">
          <div class="dialog" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h3 class="dialog-title">
                <lucide-icon name="plus" [size]="18" [strokeWidth]="2"></lucide-icon>
                New Payload
              </h3>
              <button class="dialog-close" (click)="closeCreateDialog()">
                <lucide-icon name="x" [size]="18" [strokeWidth]="2"></lucide-icon>
              </button>
            </div>
            <div class="dialog-body">
              <div class="form-group">
                <label class="form-label font-mono">TITLE</label>
                <input class="form-input" type="text" placeholder="e.g. Bash reverse shell" [(ngModel)]="newTitle" />
              </div>
              <div class="form-group">
                <label class="form-label font-mono">DESCRIPTION</label>
                <textarea class="form-textarea" rows="2" placeholder="What does this do?" [(ngModel)]="newDescription"></textarea>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label font-mono">CATEGORY</label>
                  <select class="form-select" [(ngModel)]="newCategory">
                    @for (cat of categories; track cat.key) {
                      <option [value]="cat.key">{{ cat.label }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label font-mono">VISIBILITY</label>
                  <select class="form-select" [(ngModel)]="newVisibility">
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                    <option value="team" [disabled]="teams().length === 0">Team</option>
                  </select>
                </div>
              </div>
              @if (newVisibility === 'team') {
                <div class="form-group">
                  <label class="form-label font-mono">
                    <lucide-icon name="users" [size]="12" [strokeWidth]="2"></lucide-icon>
                    SHARE WITH TEAMS
                  </label>
                  @if (teams().length === 0) {
                    <p class="form-hint form-hint-warn">
                      You are not a member of any team yet. Create or join a team first.
                    </p>
                  } @else {
                    <div class="team-picker">
                      @for (team of teams(); track team.id) {
                        <label class="team-option">
                          <input
                            type="checkbox"
                            [checked]="newTeamIds.has(team.id)"
                            (change)="toggleNewTeam(team.id, $event)"
                          />
                          <span class="team-option-name">{{ team.name }}</span>
                          <span class="team-option-meta font-mono">
                            {{ team.memberCount }} {{ team.memberCount === 1 ? 'member' : 'members' }}
                            @if (team.role === 'lead') { · LEAD }
                          </span>
                        </label>
                      }
                    </div>
                    @if (newTeamIds.size === 0) {
                      <p class="form-hint form-hint-error">
                        Select at least one team to share with.
                      </p>
                    }
                  }
                </div>
              }
              <div class="form-group">
                <label class="form-label font-mono">LANGUAGE</label>
                <input class="form-input font-mono" type="text" placeholder="e.g. bash, python, powershell" [(ngModel)]="newLanguage" />
              </div>
              <div class="form-group">
                <label class="form-label font-mono">TAGS</label>
                <app-tag-input
                  [tags]="newTags()"
                  placeholder="Add tags…"
                  (tagsChange)="newTags.set($event)"
                />
              </div>
              <div class="form-group">
                <label class="form-label font-mono">BODY</label>
                <textarea class="form-textarea font-mono" rows="8" placeholder="# Your payload..." [(ngModel)]="newBody"></textarea>
              </div>
            </div>
            <div class="dialog-footer">
              <button class="btn btn-ghost" (click)="closeCreateDialog()">Cancel</button>
              <button
                class="btn btn-primary"
                [disabled]="!canSubmitNewPayload()"
                (click)="createPayload()"
              >
                <lucide-icon name="plus" [size]="14" [strokeWidth]="2"></lucide-icon>
                Create
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

      @if (showReportDialog() && selected()) {
        <app-report-dialog
          targetType="payload"
          [targetId]="selected()!.id"
          (closed)="showReportDialog.set(false)"
        />
      }
    </div>
  `,
  styles: [`
    .cyber-toolbox { display: flex; height: calc(100dvh - 7rem); margin: -1.5rem; }
    .ctb-sidebar {
      width: 16rem; min-width: 16rem; height: 100%;
      background: var(--card); border-right: 1px solid var(--border);
      display: flex; flex-direction: column; overflow: hidden;
    }
    .sidebar-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem .75rem .75rem; border-bottom: 1px solid var(--border);
    }
    .sidebar-title {
      display: flex; align-items: center; gap: .5rem;
      font-size: .875rem; font-weight: 600; color: var(--destructive);
    }
    .btn-new {
      display: flex; align-items: center; justify-content: center;
      width: 1.75rem; height: 1.75rem; border-radius: var(--radius);
      border: 1px solid var(--border); background: transparent;
      color: var(--destructive); cursor: pointer;
    }
    .btn-new:hover { background: var(--destructive); color: var(--destructive-foreground); }
    .sidebar-search { position: relative; padding: .75rem; }
    .search-icon {
      position: absolute; left: 1.25rem; top: 50%; transform: translateY(-50%);
      color: var(--muted-foreground); pointer-events: none;
    }
    .search-input {
      width: 100%; height: 2rem; padding: 0 .5rem 0 2rem;
      background: var(--input-background); border: 1px solid var(--border);
      border-radius: var(--radius); color: var(--foreground);
      font-size: .75rem; outline: none;
    }
    .search-input:focus { border-color: var(--destructive); }
    .sidebar-visibility-toggle { display: flex; gap: .25rem; padding: 0 .75rem .5rem; }
    .vis-btn {
      flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: .25rem;
      height: 1.75rem; padding: 0 .5rem; border: 1px solid var(--border);
      background: transparent; border-radius: var(--radius);
      color: var(--muted-foreground); font-size: .6875rem; font-family: inherit; cursor: pointer;
    }
    .vis-btn:hover:not(.active) { background: var(--secondary); color: var(--foreground); }
    .vis-btn.active { background: var(--destructive); border-color: var(--destructive); color: var(--destructive-foreground); }
    .sidebar-tree { flex: 1; overflow-y: auto; padding: .25rem 0; }
    .empty-tree {
      display: flex; flex-direction: column; align-items: center; gap: .5rem;
      padding: 1.5rem 1rem; color: var(--muted-foreground); font-size: .8125rem;
    }
    .empty-tree .empty-icon { opacity: .5; }
    .tree-group { margin-bottom: .125rem; }
    .tree-folder {
      display: flex; align-items: center; gap: .375rem; width: 100%;
      padding: .375rem .75rem; border: none; background: transparent;
      color: var(--foreground); font-size: .8125rem; font-weight: 500;
      font-family: inherit; cursor: pointer;
    }
    .tree-folder:hover { background: var(--secondary); }
    .folder-icon { color: var(--destructive); }
    .folder-name { flex: 1; text-align: left; }
    .folder-count {
      font-size: .6875rem; color: var(--muted-foreground); background: var(--secondary);
      padding: .0625rem .375rem; border-radius: 9999px; font-family: 'JetBrains Mono', monospace;
    }
    .tree-items { padding-left: .5rem; }
    .tree-item {
      display: flex; align-items: center; gap: .375rem; width: 100%;
      padding: .3125rem .75rem .3125rem 1.25rem; border: none; background: transparent;
      color: var(--muted-foreground); font-size: .75rem; font-family: inherit;
      cursor: pointer; text-align: left;
    }
    .tree-item:hover { background: var(--secondary); color: var(--foreground); }
    .tree-item.active { background: color-mix(in srgb, var(--destructive) 15%, transparent); color: var(--destructive); }
    .item-icon { flex-shrink: 0; }
    .item-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .item-vis {
      font-size: .5625rem; padding: .0625rem .3125rem; border-radius: .25rem;
      background: var(--secondary); color: var(--muted-foreground); letter-spacing: .05em;
    }
    .item-vis.is-private { background: color-mix(in srgb, var(--destructive) 15%, transparent); color: var(--destructive); }
    .item-vis.is-team { background: color-mix(in srgb, var(--accent) 18%, transparent); color: var(--accent); }
    .main-content {
      flex: 1; overflow-y: auto; padding: 1.5rem 1.5rem 3rem;
      display: flex; flex-direction: column; gap: 1rem;
      min-width: 0; min-height: 0;
    }
    .header-card {
      background: var(--card); border: 1px solid var(--border);
      border-left: 3px solid var(--destructive); border-radius: var(--radius);
      padding: 1rem 1.25rem;
    }
    .header-top {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 1rem; flex-wrap: wrap;
    }
    .header-left { flex: 1; min-width: 0; }
    .payload-title { font-size: 1.375rem; font-weight: 700; color: var(--foreground); margin: 0 0 .25rem; }
    .payload-description { font-size: .875rem; color: var(--muted-foreground); margin: 0 0 .5rem; line-height: 1.5; }
    .header-meta { display: flex; align-items: center; gap: .375rem; flex-wrap: wrap; }
    .pill {
      font-size: .6875rem; padding: .1875rem .5rem; border-radius: var(--radius);
      font-weight: 500; background: var(--secondary); color: var(--muted-foreground);
      text-transform: uppercase; letter-spacing: .02em;
    }
    .pill-category { background: color-mix(in srgb, var(--destructive) 12%, transparent); color: var(--destructive); }
    .pill-language { background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); }
    .pill-visibility.is-private { background: color-mix(in srgb, var(--destructive) 15%, transparent); color: var(--destructive); }
    .pill-visibility.is-team { background: color-mix(in srgb, var(--accent) 18%, transparent); color: var(--accent); }
    .pill-owner { background: color-mix(in srgb, var(--accent) 12%, transparent); color: var(--accent); text-transform: none; }
    .pill-tag { background: var(--secondary); color: var(--muted-foreground); text-transform: none; }
    .header-actions { display: flex; align-items: center; gap: .5rem; flex-shrink: 0; flex-wrap: wrap; }
    .btn {
      display: inline-flex; align-items: center; gap: .375rem;
      padding: .5rem .875rem; border-radius: var(--radius); border: none;
      font-family: inherit; font-size: .8125rem; font-weight: 500;
      cursor: pointer; white-space: nowrap;
    }
    .btn:disabled { opacity: .7; cursor: default; }
    .btn-primary { background: var(--destructive); color: var(--destructive-foreground); }
    .btn-primary:hover:not(:disabled) { opacity: .9; }
    .btn-outline { background: transparent; color: var(--foreground); border: 1px solid var(--border); }
    .btn-outline:hover { background: var(--secondary); }
    .btn-ghost { background: transparent; color: var(--muted-foreground); }
    .btn-ghost:hover { background: var(--secondary); color: var(--foreground); }
    .btn-danger { background: transparent; color: var(--destructive); border: 1px solid var(--destructive); }
    .btn-danger:hover { background: var(--destructive); color: var(--destructive-foreground); }
    .btn-report { background: transparent; color: var(--muted-foreground); border: 1px solid var(--border); }
    .btn-report:hover {
      background: color-mix(in srgb, var(--destructive) 10%, transparent);
      color: var(--destructive);
      border-color: color-mix(in srgb, var(--destructive) 35%, transparent);
    }
    .editor-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
    .editor-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: .5rem .75rem; background: var(--secondary); border-bottom: 1px solid var(--border);
    }
    .toolbar-left { display: flex; align-items: center; gap: .5rem; }
    .toolbar-icon { color: var(--destructive); }
    .toolbar-filename { font-size: .75rem; color: var(--muted-foreground); }
    .toolbar-right { display: flex; align-items: center; gap: .375rem; }
    .mode-badge {
      display: inline-flex; align-items: center; gap: .25rem;
      font-size: .625rem; padding: .125rem .5rem; border-radius: var(--radius);
      font-weight: 600; letter-spacing: .05em;
    }
    .mode-readonly { background: var(--secondary); color: var(--muted-foreground); border: 1px solid var(--border); }
    .mode-edit { background: color-mix(in srgb, var(--destructive) 15%, transparent); color: var(--destructive); }
    .mode-enc { background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent); }
    .vars-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-left: 3px solid var(--destructive);
      border-radius: var(--radius);
      padding: 1rem 1.25rem;
    }
    .vars-header { display: flex; align-items: center; gap: .5rem; margin-bottom: .75rem; flex-wrap: wrap; }
    .vars-icon { color: var(--destructive); }
    .vars-title { font-size: .75rem; font-weight: 600; color: var(--destructive); letter-spacing: .08em; margin: 0; }
    .vars-count {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 1.5rem; height: 1.25rem; padding: 0 .4rem;
      border-radius: .625rem;
      background: color-mix(in srgb, var(--destructive) 12%, transparent);
      color: var(--destructive);
      font-size: .6875rem; font-weight: 600;
    }
    .vars-hint { font-size: .75rem; color: var(--muted-foreground); margin-left: auto; }
    .vars-hint code {
      font-size: .6875rem; padding: .0625rem .25rem;
      background: var(--secondary); border-radius: .25rem;
    }
    .vars-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
      gap: .75rem;
    }
    .var-field { display: flex; flex-direction: column; gap: .25rem; }
    .var-label { font-size: .6875rem; color: var(--destructive); font-weight: 500; }
    .var-input {
      height: 2.25rem;
      padding: 0 .625rem;
      background: var(--input-background, var(--secondary));
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) - 2px);
      color: var(--foreground);
      font-size: .8125rem;
      outline: none;
      transition: border-color .15s ease;
    }
    .var-input::placeholder { color: var(--muted-foreground); opacity: .5; }
    .var-input:focus { border-color: var(--destructive); }
    @media (max-width: 560px) {
      .vars-hint { margin-left: 0; width: 100%; }
    }

    .meta-edit-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem 1.25rem; }
    .meta-edit-title { font-size: .75rem; font-weight: 600; color: var(--destructive); letter-spacing: .08em; margin: 0 0 .75rem; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
    .form-group-span { grid-column: 1 / -1; }
    .form-group { display: flex; flex-direction: column; gap: .375rem; }
    .form-label { font-size: .6875rem; font-weight: 600; color: var(--muted-foreground); letter-spacing: .05em; }
    .form-input, .form-select {
      height: 2.375rem; padding: 0 .625rem; background: var(--input-background);
      border: 1px solid var(--border); border-radius: var(--radius);
      color: var(--foreground); font-size: .8125rem; font-family: inherit; outline: none;
    }
    .form-textarea {
      padding: .5rem .625rem; background: var(--input-background);
      border: 1px solid var(--border); border-radius: var(--radius);
      color: var(--foreground); font-size: .8125rem; font-family: inherit;
      outline: none; resize: vertical; line-height: 1.5;
    }
    .form-input:focus, .form-select:focus, .form-textarea:focus { border-color: var(--destructive); }
    .form-select { cursor: pointer; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
    .form-hint { font-size: .75rem; color: var(--muted-foreground); margin: 0; }
    .form-hint-error { color: var(--destructive); }
    .form-hint-warn { color: var(--muted-foreground); font-style: italic; }

    /* Team picker (multi-select via checkboxes) */
    .team-picker {
      display: flex; flex-direction: column; gap: .25rem;
      max-height: 12rem; overflow-y: auto; padding: .375rem;
      background: var(--input-background); border: 1px solid var(--border);
      border-radius: var(--radius);
    }
    .team-option {
      display: flex; align-items: center; gap: .5rem;
      padding: .375rem .5rem; border-radius: calc(var(--radius) - 2px);
      cursor: pointer; color: var(--foreground); font-size: .8125rem;
      transition: background-color .15s ease;
    }
    .team-option:hover { background: var(--secondary); }
    .team-option input[type='checkbox'] { accent-color: var(--destructive); cursor: pointer; }
    .team-option-name { flex: 1; font-weight: 500; }
    .team-option-meta {
      font-size: .6875rem; color: var(--muted-foreground);
      text-transform: uppercase; letter-spacing: .03em;
    }

    /* Shared teams card (destructive accent to match page theme) */
    .shared-teams-card {
      background: var(--card); border: 1px solid var(--border);
      border-left: 3px solid var(--destructive); border-radius: var(--radius);
      padding: .75rem 1rem;
    }
    .shared-teams-header {
      display: flex; align-items: center; gap: .5rem;
      margin-bottom: .5rem; flex-wrap: wrap;
    }
    .shared-teams-icon { color: var(--destructive); }
    .shared-teams-title {
      font-size: .6875rem; font-weight: 600; color: var(--destructive);
      letter-spacing: .08em; margin: 0;
    }
    .shared-teams-hint {
      font-size: .75rem; color: var(--muted-foreground);
      margin-left: auto; line-height: 1.4;
    }
    .shared-teams-list { display: flex; flex-wrap: wrap; gap: .375rem; }
    .shared-team-chip {
      display: inline-flex; align-items: center; gap: .375rem;
      padding: .25rem .5rem .25rem .625rem;
      background: color-mix(in srgb, var(--destructive) 10%, transparent);
      color: var(--destructive); border-radius: var(--radius);
      font-size: .75rem; font-weight: 500;
    }
    .shared-team-chip-unshare {
      display: inline-flex; align-items: center; justify-content: center;
      width: 1rem; height: 1rem; border-radius: 50%;
      border: none; background: transparent; color: currentColor;
      cursor: pointer; opacity: .7; padding: 0;
      transition: background-color .15s ease, color .15s ease, opacity .15s ease;
    }
    .shared-team-chip-unshare:hover {
      background: var(--destructive); color: var(--destructive-foreground); opacity: 1;
    }
    @media (max-width: 560px) {
      .shared-teams-hint { margin-left: 0; width: 100%; }
    }
    .empty-state, .loading-state {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 1rem; padding: 3rem 1rem; flex: 1; text-align: center;
    }
    .loading-state { color: var(--muted-foreground); font-size: .875rem; }
    .empty-icon-wrap {
      width: 4rem; height: 4rem; display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--destructive); border-radius: var(--radius);
      background: color-mix(in srgb, var(--destructive) 8%, transparent);
    }
    .empty-icon { color: var(--destructive); }
    .empty-title { font-size: 1rem; font-weight: 700; color: var(--foreground); letter-spacing: .08em; }
    .empty-description { font-size: .875rem; color: var(--muted-foreground); max-width: 28rem; line-height: 1.6; }
    .spinner {
      width: 2rem; height: 2rem; border: 2px solid var(--border);
      border-top-color: var(--destructive); border-radius: 50%; animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .security-notice {
      display: flex; align-items: flex-start; gap: .75rem;
      padding: 1rem 1.25rem; border: 1px solid var(--destructive); border-left-width: 3px;
      background: color-mix(in srgb, var(--destructive) 10%, transparent);
      border-radius: var(--radius); margin-top: auto;
    }
    .notice-icon { color: var(--destructive); flex-shrink: 0; margin-top: .125rem; }
    .notice-body { flex: 1; min-width: 0; }
    .notice-title { font-size: .75rem; font-weight: 700; color: var(--destructive); letter-spacing: .08em; margin: 0 0 .25rem; }
    .notice-text { font-size: .8125rem; color: var(--foreground); line-height: 1.5; margin: 0; }
    .dialog-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 100; backdrop-filter: blur(2px);
    }
    .dialog {
      background: var(--card); border: 1px solid var(--border); border-radius: var(--radius);
      width: 100%; max-width: 36rem; max-height: 90vh; overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,.25);
    }
    .dialog-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.25rem; border-bottom: 1px solid var(--border);
    }
    .dialog-title { display: flex; align-items: center; gap: .5rem; font-size: 1rem; font-weight: 600; color: var(--foreground); }
    .dialog-close {
      display: flex; align-items: center; justify-content: center;
      width: 2rem; height: 2rem; border-radius: var(--radius); border: none;
      background: transparent; color: var(--muted-foreground); cursor: pointer;
    }
    .dialog-close:hover { background: var(--secondary); color: var(--foreground); }
    .dialog-body { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
    .dialog-footer {
      display: flex; justify-content: flex-end; gap: .5rem;
      padding: 1rem 1.25rem; border-top: 1px solid var(--border);
    }
    .error-toast {
      position: fixed; bottom: 1.5rem; right: 1.5rem;
      display: flex; align-items: center; gap: .5rem;
      padding: .75rem 1rem; background: var(--destructive); color: var(--destructive-foreground);
      border-radius: var(--radius); font-size: .8125rem; z-index: 200;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,.1);
    }
    .toast-close { border: none; background: transparent; color: inherit; cursor: pointer; margin-left: .5rem; opacity: .7; }
    .toast-close:hover { opacity: 1; }
    @media (max-width: 900px) {
      .cyber-toolbox { flex-direction: column; height: auto; }
      .ctb-sidebar { width: 100%; min-width: 0; max-height: 14rem; border-right: none; border-bottom: 1px solid var(--border); }
      .main-content { padding: 1rem; }
      .meta-grid, .form-row { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      .cyber-toolbox { margin: -1rem -0.75rem; min-height: calc(100dvh - 3.25rem - 2rem); }
      .main-content { padding: 0.75rem; }
      .dialog { padding: 1rem 0.5rem; }
      .dialog-card { max-width: 100%; padding: 1rem; max-height: 90vh; }
    }
    @media (max-width: 560px) {
      .header-actions { width: 100%; }
      .header-actions .btn { flex: 1; justify-content: center; }
    }
  `],
})
export class CyberToolboxComponent implements OnInit {
  readonly payloadService = inject(PayloadService);
  readonly auth = inject(AuthService);
  readonly teamService = inject(TeamService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly route = inject(ActivatedRoute);

  readonly categories = CATEGORIES;

  readonly payloads = signal<PayloadListItem[]>([]);
  readonly selected = signal<Payload | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  /** Teams the current user belongs to — drives the sharing multi-select. */
  readonly teams = signal<TeamSummary[]>([]);

  readonly filterText = signal('');
  readonly privateOnly = signal(false);
  readonly expandedCategories = signal<Set<PayloadCategory>>(
    new Set<PayloadCategory>(['recon', 'exploitation', 'privesc', 'post-exploitation', 'defense', 'other']),
  );

  readonly isEditing = signal(false);
  readonly copySuccess = signal(false);
  readonly showReportDialog = signal(false);
  readonly showCreateDialog = signal(false);

  /**
   * Template variables: `{{NAME}}` placeholders detected in the payload body.
   * Values are filled client-side at preview/copy time — substitution is never
   * persisted, so the source body stays reusable.
   */
  readonly variableValues = signal<Map<string, string>>(new Map());

  // Edit buffers
  editTitle = '';
  editDescription = '';
  editLanguage = '';
  editCategory: PayloadCategory = 'other';
  editVisibility: PayloadVisibility = 'private';
  readonly editTags = signal<string[]>([]);
  /** Selected team ids for the edit form when editVisibility='team'. */
  editTeamIds = new Set<string>();
  private editedBody = '';

  // Create dialog buffers
  newTitle = '';
  newDescription = '';
  newLanguage = 'bash';
  newCategory: PayloadCategory = 'recon';
  newVisibility: PayloadVisibility = 'private';
  readonly newTags = signal<string[]>([]);
  newBody = '';
  /** Selected team ids for the create form when newVisibility='team'. */
  newTeamIds = new Set<string>();

  // Reactive user state
  private readonly currentUserId = signal<string | null>(null);
  private readonly currentUsername = signal<string | null>(null);
  private readonly isAdmin = signal(false);

  readonly canModifySelected = computed(() => {
    const p = this.selected();
    if (!p) return false;
    const uid = this.currentUserId();
    const uname = this.currentUsername();
    if (uid && p.owner.id === uid) return true;
    if (uname && p.owner.username === uname) return true;
    return this.isAdmin() && p.visibility === 'public';
  });

  /** Team ids where the current user is the lead. */
  readonly myLeadTeamIds = computed(() => {
    const ids = new Set<string>();
    for (const t of this.teams()) {
      if (t.role === 'lead') ids.add(t.id);
    }
    return ids;
  });

  /**
   * Projection of sharedTeams for the UI: carries a per-user `canUnshare`.
   * The payload owner can unshare any team; a team's lead can unshare
   * their own team.
   */
  readonly sharedTeamsView = computed(() => {
    const p = this.selected();
    if (!p || p.visibility !== 'team') return [];
    const teams = p.sharedTeams ?? [];
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
   * What Monaco shows: raw body (with `{{VAR}}`) while editing so the source
   * stays intact, or the substituted preview in read-only mode so users see
   * what Copy will yield. Substitutions are client-side only.
   */
  readonly displayedBody = computed(() => {
    const p = this.selected();
    if (!p) return '';
    if (this.isEditing()) return this.editedBody;
    return this.applyVariables(p.body);
  });

  /** Unique `{{VAR}}` names currently present in the selected payload's body. */
  readonly templateVariables = computed((): TemplateVariable[] => {
    const p = this.selected();
    const source = p ? (this.isEditing() ? this.editedBody : p.body) : '';
    if (!source) return [];
    const names = new Set<string>();
    const regex = /\{\{(\w+)\}\}/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(source)) !== null) names.add(match[1]);
    const vals = this.variableValues();
    return Array.from(names).map(name => ({ name, value: vals.get(name) ?? '' }));
  });

  readonly filteredGroups = computed(() => {
    const q = this.filterText().trim().toLowerCase();
    const privateOnly = this.privateOnly();
    const items = this.payloads().filter(p => {
      if (privateOnly && p.visibility !== 'private') return false;
      if (!q) return true;
      if (p.title.toLowerCase().includes(q)) return true;
      if (p.description?.toLowerCase().includes(q)) return true;
      if (p.language?.toLowerCase().includes(q)) return true;
      if (p.tags.some(t => t.name.toLowerCase().includes(q))) return true;
      return false;
    });

    return CATEGORIES
      .map(cat => ({
        key: cat.key,
        label: cat.label,
        items: items.filter(p => p.category === cat.key),
      }))
      .filter(g => g.items.length > 0);
  });

  constructor() {
    this.auth.userData$.subscribe(user => {
      this.currentUsername.set(user?.username ?? null);
      // We don't have the numeric/uuid user id from userinfo; username is the
      // primary comparator. Keeping the id slot for symmetry with spec.
      this.currentUserId.set(null);
    });
    this.auth.isAdmin$.subscribe(isAdmin => this.isAdmin.set(isAdmin));
    // Refresh the teams list on auth transitions so the sharing multi-select
    // and shared-teams chips reflect the current user.
    this.auth.isAuthenticated$.subscribe(isAuth => {
      if (isAuth) this.loadTeams();
      else this.teams.set([]);
    });
  }

  private loadTeams(): void {
    this.teamService.list().subscribe({
      next: teams => this.teams.set(teams),
      error: () => {
        /* silent — sharing UI simply stays empty until teams load */
      },
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadPayloads();
      this.route.queryParamMap.subscribe(pm => {
        const qpId = pm.get('payload');
        if (!qpId) return;
        if (this.selected()?.id === qpId) return;
        const found = this.payloads().find(p => p.id === qpId);
        if (found) this.onSelectPayload(found);
      });
    }
  }

  loadPayloads(): void {
    this.loading.set(true);
    this.payloadService.list().subscribe({
      next: (items) => {
        this.payloads.set(items);
        this.loading.set(false);
        // Deep-link: auto-select payload from ?payload=ID query param
        const qpId = this.route.snapshot.queryParamMap.get('payload');
        if (qpId && !this.selected()) {
          const found = items.find(p => p.id === qpId);
          if (found) {
            this.onSelectPayload(found);
          }
        }
      },
      error: (err) => {
        console.error('Failed to load payloads', err);
        this.loading.set(false);
        if (err.status !== 401 && err.status !== 403) {
          this.showError('Failed to load payloads. Please try again.');
        }
      },
    });
  }

  categoryLabel(key: PayloadCategory): string {
    return CATEGORIES.find(c => c.key === key)?.label ?? key;
  }

  toggleCategory(key: PayloadCategory): void {
    const next = new Set(this.expandedCategories());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.expandedCategories.set(next);
  }

  onSelectPayload(item: PayloadListItem): void {
    this.isEditing.set(false);
    this.variableValues.set(new Map());
    this.loading.set(true);
    this.payloadService.get(item.id).subscribe({
      next: (payload) => {
        this.selected.set(payload);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load payload', err);
        this.loading.set(false);
        this.showError('Failed to load payload details.');
      },
    });
  }

  updateVariable(name: string, value: string): void {
    const next = new Map(this.variableValues());
    next.set(name, value);
    this.variableValues.set(next);
  }

  /** Replace every `{{NAME}}` with its buffered value. Unfilled placeholders stay visible. */
  private applyVariables(source: string): string {
    if (!source) return source;
    let out = source;
    for (const [name, value] of this.variableValues().entries()) {
      if (value) out = out.replaceAll(`{{${name}}}`, value);
    }
    return out;
  }

  startEdit(): void {
    const p = this.selected();
    if (!p) return;
    this.editTitle = p.title;
    this.editDescription = p.description ?? '';
    this.editLanguage = p.language ?? '';
    this.editCategory = p.category;
    this.editVisibility = p.visibility;
    this.editTags.set(p.tags.map(t => t.name));
    this.editedBody = p.body;
    // Pre-populate the team picker with the payload's current shared teams
    // so the user starts from the existing state, not an empty selection.
    this.editTeamIds = new Set((p.sharedTeams ?? []).map(t => t.id));
    // Make sure the teams list is up-to-date when entering edit mode.
    this.loadTeams();
    this.isEditing.set(true);
  }

  /** Toggle a team in the edit form multi-select. */
  toggleEditTeam(teamId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set(this.editTeamIds);
    if (checked) next.add(teamId);
    else next.delete(teamId);
    this.editTeamIds = next;
  }

  /** Guard for the Save button — mirrors the backend visibility/team rule. */
  canSaveEdits(): boolean {
    if (!this.editTitle.trim()) return false;
    if (this.editVisibility === 'team' && this.editTeamIds.size === 0) return false;
    return true;
  }

  cancelEdit(): void {
    this.isEditing.set(false);
  }

  onBodyChange(code: string): void {
    this.editedBody = code;
  }

  onSaveEdits(): void {
    const p = this.selected();
    if (!p) return;
    if (!this.canSaveEdits()) return;
    const tags = this.editTags();
    const update: PayloadUpdateInput = {
      title: this.editTitle.trim() || p.title,
      description: this.editDescription.trim() || null,
      category: this.editCategory,
      language: this.editLanguage.trim() || null,
      visibility: this.editVisibility,
      body: this.editedBody,
      tags,
    };
    // Only send sharedTeamIds when visibility='team' — otherwise omit so the
    // server doesn't reject the payload (non-team visibility with ids=422).
    if (this.editVisibility === 'team') {
      update.sharedTeamIds = Array.from(this.editTeamIds);
    }
    this.payloadService.update(p.id, update).subscribe({
      next: (updated) => {
        this.selected.set(updated);
        this.isEditing.set(false);
        this.loadPayloads();
      },
      error: () => this.showError('Failed to save payload.'),
    });
  }

  async confirmDelete(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const p = this.selected();
    if (!p) return;
    const ok = await this.confirmDialog.confirm({
      title: `Delete payload "${p.title}"?`,
      message: 'This action cannot be undone. The encrypted body will be permanently removed from the server.',
      confirmLabel: 'Delete payload',
      cancelLabel: 'Cancel',
      variant: 'destructive',
    });
    if (!ok) return;
    this.payloadService.delete(p.id).subscribe({
      next: () => {
        this.selected.set(null);
        this.loadPayloads();
      },
      error: () => this.showError('Failed to delete payload.'),
    });
  }

  openReportDialog(): void {
    this.showReportDialog.set(true);
  }

  async copyBody(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const p = this.selected();
    if (!p) return;
    // Always copy with variable substitutions applied — users expect the
    // preview they see to match what lands in the clipboard.
    const source = this.isEditing() ? this.editedBody : p.body;
    const text = this.applyVariables(source);
    try {
      await navigator.clipboard.writeText(text);
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
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

  openCreateDialog(): void {
    this.newTitle = '';
    this.newDescription = '';
    this.newLanguage = 'bash';
    this.newCategory = 'recon';
    this.newVisibility = 'private';
    this.newTags.set([]);
    this.newBody = '';
    this.newTeamIds = new Set<string>();
    this.loadTeams();
    this.showCreateDialog.set(true);
  }

  closeCreateDialog(): void {
    this.showCreateDialog.set(false);
  }

  /** Toggle a team in the create dialog multi-select. */
  toggleNewTeam(teamId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set(this.newTeamIds);
    if (checked) next.add(teamId);
    else next.delete(teamId);
    this.newTeamIds = next;
  }

  /** Guard for the Create button — mirrors backend visibility/team rule. */
  canSubmitNewPayload(): boolean {
    if (!this.newTitle.trim() || !this.newBody.trim()) return false;
    if (this.newVisibility === 'team' && this.newTeamIds.size === 0) return false;
    return true;
  }

  createPayload(): void {
    if (!this.canSubmitNewPayload()) return;
    const input: PayloadCreateInput = {
      title: this.newTitle.trim(),
      description: this.newDescription.trim() || null,
      category: this.newCategory,
      language: this.newLanguage.trim() || null,
      visibility: this.newVisibility,
      body: this.newBody,
      tags: this.newTags(),
    };
    if (this.newVisibility === 'team') {
      input.sharedTeamIds = Array.from(this.newTeamIds);
    }
    this.payloadService.create(input).subscribe({
      next: (created) => {
        this.closeCreateDialog();
        this.loadPayloads();
        this.selected.set(created);
      },
      error: () => this.showError('Failed to create payload.'),
    });
  }

  /**
   * Soft-unshare this payload from a team. Confirms first, then refetches
   * the payload to reflect the new sharedTeams list + potential auto-flip
   * to visibility='private' when it was the last team.
   */
  async confirmUnshareTeam(team: { id: string; name: string }): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const p = this.selected();
    if (!p) return;
    const ok = await this.confirmDialog.confirm({
      title: `Unshare from "${team.name}"?`,
      message:
        'The team will lose access to this payload. ' +
        'If this is the last team, the payload flips back to private — ' +
        'nothing is deleted.',
      confirmLabel: 'Unshare',
      cancelLabel: 'Cancel',
      variant: 'destructive',
    });
    if (!ok) return;
    this.payloadService.unshareFromTeam(p.id, team.id).subscribe({
      next: () => {
        this.payloadService.get(p.id).subscribe({
          next: (updated) => {
            this.selected.set(updated);
            this.loadPayloads();
          },
          error: () => {
            // Lost read access after unshare (e.g. we were a lead-only viewer).
            this.selected.set(null);
            this.loadPayloads();
          },
        });
      },
      error: () => this.showError('Failed to unshare payload from team.'),
    });
  }

  private showError(message: string): void {
    this.errorMessage.set(message);
    setTimeout(() => this.errorMessage.set(''), 5000);
  }
}
