import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  LUCIDE_ICONS,
  LucideAngularModule,
  LucideIconProvider,
  AlertTriangle,
  BarChart3,
  Check,
  Code2,
  FileCode,
  GitMerge,
  Hash,
  Search,
  Shield,
  ShieldCheck,
  Star,
  Tag as TagIcon,
  Terminal,
  Trash2,
  Users,
  X,
  Plus,
} from 'lucide-angular';
import { AdminService } from '../../core/services/admin.service';
import { TagService } from '../../core/services/tag.service';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { AdminPublicContent, AdminStats } from '../../core/models/admin.model';
import { AdminTag } from '../../core/models/tag.model';

const icons = {
  AlertTriangle,
  BarChart3,
  Check,
  Code2,
  FileCode,
  GitMerge,
  Hash,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Star,
  Tag: TagIcon,
  Terminal,
  Trash2,
  Users,
  X,
};

type AdminTab = 'stats' | 'tags' | 'moderation';

/**
 * Admin dashboard with 3 tabs:
 *   - Stats: global counters (users/teams/tags/content by visibility)
 *   - Tags: inline rename, officialize toggle, merge, delete (see TagService)
 *   - Moderation: public concepts + payloads, with a shortcut to open the
 *     resource in its native module for edit/delete (uses existing Voter
 *     allow-admin-on-public rule — no new backend route needed).
 *
 * Guarded by adminGuard (client-side polish). Backend enforces ROLE_ADMIN
 * on every /api/admin/* endpoint.
 */
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <div class="admin-page">
      <header class="page-header">
        <div class="page-header-icon">
          <lucide-icon name="shield" [size]="22" [strokeWidth]="2"></lucide-icon>
        </div>
        <div class="page-header-text">
          <h1 class="page-title">ADMIN</h1>
          <p class="page-subtitle">Global moderation and tag governance</p>
        </div>
      </header>

      <nav class="tabs">
        <button
          type="button"
          class="tab"
          [class.active]="activeTab() === 'stats'"
          (click)="setTab('stats')"
        >
          <lucide-icon name="bar-chart-3" [size]="14" [strokeWidth]="2"></lucide-icon>
          Stats
        </button>
        <button
          type="button"
          class="tab"
          [class.active]="activeTab() === 'tags'"
          (click)="setTab('tags')"
        >
          <lucide-icon name="tag" [size]="14" [strokeWidth]="2"></lucide-icon>
          Tags
        </button>
        <button
          type="button"
          class="tab"
          [class.active]="activeTab() === 'moderation'"
          (click)="setTab('moderation')"
        >
          <lucide-icon name="shield-check" [size]="14" [strokeWidth]="2"></lucide-icon>
          Moderation
        </button>
      </nav>

      @if (errorMessage()) {
        <div class="notice notice-error">
          <lucide-icon name="alert-triangle" [size]="14" [strokeWidth]="2"></lucide-icon>
          {{ errorMessage() }}
        </div>
      }

      <!-- STATS TAB ----------------------------------------------------- -->
      @if (activeTab() === 'stats') {
        @if (stats()) {
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label font-mono">USERS</div>
              <div class="stat-value">{{ stats()!.users }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label font-mono">TEAMS</div>
              <div class="stat-value">{{ stats()!.teams }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label font-mono">TAGS</div>
              <div class="stat-value">{{ stats()!.tags.total }}</div>
              <div class="stat-hint font-mono">
                {{ stats()!.tags.official }} official
              </div>
            </div>
            <div class="stat-card stat-card-span">
              <div class="stat-label font-mono">
                <lucide-icon name="code-2" [size]="11" [strokeWidth]="2"></lucide-icon>
                CONCEPTS — {{ stats()!.concepts.total }}
              </div>
              <div class="breakdown">
                <span class="chip chip-public font-mono">public · {{ stats()!.concepts.public }}</span>
                <span class="chip chip-team font-mono">team · {{ stats()!.concepts.team }}</span>
                <span class="chip chip-private font-mono">private · {{ stats()!.concepts.private }}</span>
              </div>
            </div>
            <div class="stat-card stat-card-span">
              <div class="stat-label font-mono">
                <lucide-icon name="file-code" [size]="11" [strokeWidth]="2"></lucide-icon>
                PAYLOADS — {{ stats()!.payloads.total }}
              </div>
              <div class="breakdown">
                <span class="chip chip-public font-mono">public · {{ stats()!.payloads.public }}</span>
                <span class="chip chip-team font-mono">team · {{ stats()!.payloads.team }}</span>
                <span class="chip chip-private font-mono">private · {{ stats()!.payloads.private }}</span>
              </div>
            </div>
          </div>
        } @else if (loading()) {
          <p class="muted">Loading stats…</p>
        }
      }

      <!-- TAGS TAB ------------------------------------------------------ -->
      @if (activeTab() === 'tags') {
        <div class="tags-toolbar">
          <div class="search-box">
            <lucide-icon name="search" [size]="14" [strokeWidth]="2"></lucide-icon>
            <input
              type="text"
              class="search-input font-mono"
              placeholder="Filter tags…"
              [(ngModel)]="tagFilter"
            />
          </div>
          <span class="muted font-mono">
            {{ filteredTags().length }} / {{ allTags().length }} tags
          </span>
          <button class="btn btn-primary" (click)="showCreateTag.set(true)" [disabled]="showCreateTag()">
            <lucide-icon name="plus" [size]="14" [strokeWidth]="2"></lucide-icon>
            New tag
          </button>
        </div>

        @if (showCreateTag()) {
          <div class="create-tag-row card">
            <input
              type="text"
              class="inline-input font-mono"
              placeholder="tag name…"
              [(ngModel)]="newTagName"
              (keydown.enter)="createTag()"
              (keydown.escape)="cancelCreateTag()"
            />
            <label class="create-tag-toggle">
              <input type="checkbox" [(ngModel)]="newTagOfficial" />
              <lucide-icon name="star" [size]="12" [strokeWidth]="2"></lucide-icon>
              Official
            </label>
            <button class="btn btn-xs btn-primary" [disabled]="!newTagName.trim()" (click)="createTag()">
              <lucide-icon name="check" [size]="12" [strokeWidth]="2"></lucide-icon>
              Create
            </button>
            <button class="btn btn-xs btn-ghost" (click)="cancelCreateTag()">
              <lucide-icon name="x" [size]="12" [strokeWidth]="2"></lucide-icon>
            </button>
          </div>
        }

        @if (loading() && allTags().length === 0) {
          <p class="muted">Loading tags…</p>
        } @else {
          <div class="tag-table card">
            <div class="tag-row tag-row-head font-mono">
              <div class="col-name">NAME</div>
              <div class="col-count">USAGE</div>
              <div class="col-flag">OFFICIAL</div>
              <div class="col-actions">ACTIONS</div>
            </div>
            @for (t of filteredTags(); track t.id) {
              <div class="tag-row">
                <div class="col-name">
                  @if (editingTagId() === t.id) {
                    <input
                      type="text"
                      class="inline-input font-mono"
                      [(ngModel)]="tagRenameDraft"
                      (keydown.enter)="saveTagRename(t)"
                      (keydown.escape)="cancelTagRename()"
                    />
                    <button class="btn btn-xs btn-primary" (click)="saveTagRename(t)">
                      <lucide-icon name="check" [size]="12" [strokeWidth]="2"></lucide-icon>
                    </button>
                    <button class="btn btn-xs btn-ghost" (click)="cancelTagRename()">
                      <lucide-icon name="x" [size]="12" [strokeWidth]="2"></lucide-icon>
                    </button>
                  } @else {
                    <lucide-icon
                      [name]="t.isOfficial ? 'star' : 'hash'"
                      [size]="11"
                      [strokeWidth]="2"
                      [class.official-icon]="t.isOfficial"
                    ></lucide-icon>
                    <button
                      type="button"
                      class="tag-name-btn font-mono"
                      (click)="startTagRename(t)"
                      title="Click to rename"
                    >
                      {{ t.name }}
                    </button>
                  }
                </div>
                <div class="col-count font-mono">
                  <span class="usage-split" title="{{ t.conceptCount }} concepts, {{ t.payloadCount }} payloads">
                    {{ t.usageCount }}
                    <span class="muted">({{ t.conceptCount }}/{{ t.payloadCount }})</span>
                  </span>
                </div>
                <div class="col-flag">
                  <button
                    type="button"
                    class="toggle-btn"
                    [class.on]="t.isOfficial"
                    (click)="toggleOfficial(t)"
                    [title]="t.isOfficial ? 'Revoke official status' : 'Mark as official'"
                  >
                    @if (t.isOfficial) {
                      <lucide-icon name="star" [size]="12" [strokeWidth]="2.5"></lucide-icon>
                    } @else {
                      <lucide-icon name="hash" [size]="12" [strokeWidth]="2"></lucide-icon>
                    }
                  </button>
                </div>
                <div class="col-actions">
                  <button
                    type="button"
                    class="btn btn-xs btn-outline"
                    (click)="openMergeFor(t)"
                    title="Merge into another tag"
                  >
                    <lucide-icon name="git-merge" [size]="12" [strokeWidth]="2"></lucide-icon>
                    Merge
                  </button>
                  <button
                    type="button"
                    class="btn btn-xs btn-danger"
                    (click)="confirmDelete(t)"
                    title="Delete tag"
                  >
                    <lucide-icon name="trash-2" [size]="12" [strokeWidth]="2"></lucide-icon>
                  </button>
                </div>
              </div>
            } @empty {
              <div class="tag-row tag-row-empty muted">No tag matches the filter.</div>
            }
          </div>
        }

        <!-- Merge dialog -->
        @if (mergeSource()) {
          <div class="dialog-backdrop" (click)="cancelMerge()">
            <div class="dialog" (click)="$event.stopPropagation()">
              <div class="dialog-header">
                <h3 class="dialog-title">
                  <lucide-icon name="git-merge" [size]="18" [strokeWidth]="2"></lucide-icon>
                  Merge tag
                </h3>
                <button class="dialog-close" (click)="cancelMerge()">
                  <lucide-icon name="x" [size]="18" [strokeWidth]="2"></lucide-icon>
                </button>
              </div>
              <div class="dialog-body">
                <p class="muted">
                  All concepts and payloads currently tagged
                  <strong class="font-mono">{{ mergeSource()!.name }}</strong>
                  will be re-tagged with the target below. The source tag is
                  then deleted.
                </p>
                <label class="form-label font-mono">TARGET TAG</label>
                <select class="form-select" [(ngModel)]="mergeTargetId">
                  <option [ngValue]="null" disabled>Select a target tag…</option>
                  @for (t of allTags(); track t.id) {
                    @if (t.id !== mergeSource()!.id) {
                      <option [ngValue]="t.id">
                        {{ t.name }}{{ t.isOfficial ? ' · official' : '' }} · {{ t.usageCount }} uses
                      </option>
                    }
                  }
                </select>
              </div>
              <div class="dialog-footer">
                <button class="btn btn-ghost" (click)="cancelMerge()">Cancel</button>
                <button
                  class="btn btn-primary"
                  [disabled]="!mergeTargetId"
                  (click)="confirmMerge()"
                >
                  <lucide-icon name="git-merge" [size]="14" [strokeWidth]="2"></lucide-icon>
                  Merge
                </button>
              </div>
            </div>
          </div>
        }
      }

      <!-- MODERATION TAB ------------------------------------------------ -->
      @if (activeTab() === 'moderation') {
        <div class="tags-toolbar">
          <div class="search-box">
            <lucide-icon name="search" [size]="14" [strokeWidth]="2"></lucide-icon>
            <input
              type="text"
              class="search-input font-mono"
              placeholder="Search public content by title…"
              [(ngModel)]="moderationQuery"
              (keydown.enter)="loadModeration()"
            />
          </div>
          <button class="btn btn-outline" (click)="loadModeration()">Search</button>
        </div>

        @if (loading() && !moderation()) {
          <p class="muted">Loading…</p>
        } @else if (moderation(); as mod) {
          <section class="mod-section">
            <h2 class="section-title font-mono">
              <lucide-icon name="code-2" [size]="14" [strokeWidth]="2"></lucide-icon>
              PUBLIC CONCEPTS · {{ mod.concepts.length }}
            </h2>
            @if (mod.concepts.length === 0) {
              <p class="muted">No public concept matches.</p>
            } @else {
              <div class="mod-list">
                @for (c of mod.concepts; track c.id) {
                  <a class="mod-row" [routerLink]="['/dev-library']" [queryParams]="{ concept: c.id }">
                    <div class="mod-row-main">
                      <span class="mod-title">{{ c.title }}</span>
                      @if (c.description) {
                        <span class="mod-desc">{{ c.description }}</span>
                      }
                    </div>
                    <div class="mod-row-meta font-mono">
                      <span class="meta-chip">by {{ c.owner.username }}</span>
                      <span class="meta-chip">{{ c.snippetCount }} snippet{{ c.snippetCount === 1 ? '' : 's' }}</span>
                    </div>
                  </a>
                }
              </div>
            }
          </section>

          <section class="mod-section">
            <h2 class="section-title font-mono">
              <lucide-icon name="file-code" [size]="14" [strokeWidth]="2"></lucide-icon>
              PUBLIC PAYLOADS · {{ mod.payloads.length }}
            </h2>
            @if (mod.payloads.length === 0) {
              <p class="muted">No public payload matches.</p>
            } @else {
              <div class="mod-list">
                @for (p of mod.payloads; track p.id) {
                  <a class="mod-row" [routerLink]="['/cyber-toolbox']" [queryParams]="{ payload: p.id }">
                    <div class="mod-row-main">
                      <span class="mod-title">{{ p.title }}</span>
                      @if (p.description) {
                        <span class="mod-desc">{{ p.description }}</span>
                      }
                    </div>
                    <div class="mod-row-meta font-mono">
                      <span class="meta-chip">by {{ p.owner.username }}</span>
                      <span class="meta-chip">{{ p.category }}</span>
                      @if (p.language) {
                        <span class="meta-chip">{{ p.language }}</span>
                      }
                    </div>
                  </a>
                }
              </div>
            }
          </section>
        }
      }
    </div>
  `,
  styles: [`
    .admin-page {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 0.5rem 0 3rem;
    }

    /* Page header */
    .page-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.25rem;
    }
    .page-header-icon {
      display: flex; align-items: center; justify-content: center;
      width: 2.5rem; height: 2.5rem;
      background: color-mix(in srgb, var(--primary) 12%, transparent);
      color: var(--primary);
      border-radius: var(--radius);
    }
    .page-title {
      font-size: 1.25rem; font-weight: 700;
      letter-spacing: 0.08em;
      margin: 0;
      font-family: 'JetBrains Mono', monospace;
    }
    .page-subtitle {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--muted-foreground);
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 0.25rem;
      border-bottom: 1px solid var(--border);
    }
    .tab {
      display: inline-flex; align-items: center; gap: 0.375rem;
      padding: 0.5rem 0.875rem;
      border: none;
      background: transparent;
      color: var(--muted-foreground);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem; font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: color 0.15s, border-color 0.15s;
    }
    .tab:hover { color: var(--foreground); }
    .tab.active { color: var(--primary); border-bottom-color: var(--primary); }

    /* Notice */
    .notice {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.625rem 0.875rem;
      border-radius: var(--radius);
      font-size: 0.8125rem;
    }
    .notice-error {
      background: color-mix(in srgb, var(--destructive) 10%, transparent);
      color: var(--destructive);
      border: 1px solid color-mix(in srgb, var(--destructive) 30%, transparent);
    }

    /* Stats grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }
    .stat-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1rem 1.125rem;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .stat-card-span { grid-column: span 3; }
    .stat-label {
      display: inline-flex; align-items: center; gap: 0.375rem;
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--muted-foreground);
      letter-spacing: 0.06em;
    }
    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--foreground);
      line-height: 1;
      font-family: 'JetBrains Mono', monospace;
    }
    .stat-hint {
      font-size: 0.6875rem;
      color: var(--accent);
    }
    .breakdown { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .chip {
      font-size: 0.6875rem;
      padding: 0.1875rem 0.5rem;
      border-radius: 999px;
      border: 1px solid var(--border);
    }
    .chip-public {
      background: color-mix(in srgb, var(--primary) 12%, transparent);
      color: var(--primary);
      border-color: color-mix(in srgb, var(--primary) 28%, transparent);
    }
    .chip-team {
      background: color-mix(in srgb, var(--accent) 12%, transparent);
      color: var(--accent);
      border-color: color-mix(in srgb, var(--accent) 28%, transparent);
    }
    .chip-private {
      background: var(--secondary);
      color: var(--muted-foreground);
    }
    @media (max-width: 768px) {
      .admin-page { padding: 0.25rem 0 2rem; gap: 0.75rem; }
      .page-header { gap: 0.5rem; }
      .page-title { font-size: 1rem; }
      .page-subtitle { font-size: 0.75rem; }
      .stats-grid { grid-template-columns: 1fr; }
      .stat-card-span { grid-column: auto; }
      .stat-value { font-size: 1.375rem; }
      .tab { padding: 0.375rem 0.625rem; font-size: 0.6875rem; }
      .tags-toolbar { gap: 0.375rem; }
      .search-box { min-width: 0; }
      .tag-row {
        grid-template-columns: 1fr;
        gap: 0.375rem;
        padding: 0.625rem 0.75rem;
      }
      .tag-row-head { display: none; }
      .col-count { text-align: left; }
      .col-flag { justify-content: flex-start; }
      .col-actions { justify-content: flex-start; }
      .mod-row { flex-direction: column; align-items: flex-start; gap: 0.375rem; }
      .mod-row-meta { margin-top: 0.125rem; }
      .create-tag-row { flex-wrap: wrap; }
      .dialog { max-width: calc(100vw - 2rem); }
    }

    /* Tags toolbar / search */
    .tags-toolbar {
      display: flex; align-items: center; gap: 0.5rem;
      flex-wrap: wrap;
    }
    .search-box {
      flex: 1; min-width: 14rem;
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0 0.625rem;
      background: var(--input-background);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--muted-foreground);
    }
    .search-input {
      flex: 1;
      border: none; outline: none;
      background: transparent;
      color: var(--foreground);
      font-size: 0.8125rem;
      padding: 0.5rem 0;
    }

    /* Tag table */
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }
    .tag-table { display: flex; flex-direction: column; overflow: hidden; }
    .tag-row {
      display: grid;
      grid-template-columns: 1.5fr 0.9fr 0.5fr 1fr;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.875rem;
      border-bottom: 1px solid var(--border);
      font-size: 0.8125rem;
    }
    .tag-row:last-child { border-bottom: none; }
    .tag-row-head {
      background: var(--secondary);
      color: var(--muted-foreground);
      font-size: 0.6875rem;
      letter-spacing: 0.06em;
    }
    .tag-row-empty {
      padding: 1.25rem;
      justify-items: center;
      text-align: center;
      display: block;
    }
    .col-name {
      display: inline-flex; align-items: center; gap: 0.5rem;
      min-width: 0;
    }
    .col-name .official-icon { color: var(--accent); }
    .tag-name-btn {
      background: transparent;
      border: none;
      color: var(--foreground);
      cursor: pointer;
      padding: 0;
      font-size: 0.8125rem;
      text-align: left;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tag-name-btn:hover { color: var(--primary); text-decoration: underline; }
    .inline-input {
      flex: 1;
      min-width: 0;
      padding: 0.25rem 0.5rem;
      background: var(--input-background);
      border: 1px solid var(--primary);
      border-radius: var(--radius);
      color: var(--foreground);
      font-size: 0.8125rem;
      outline: none;
    }
    .col-count { text-align: right; font-size: 0.8125rem; }
    .usage-split .muted { margin-left: 0.25rem; font-size: 0.6875rem; }

    .col-flag { display: flex; justify-content: center; }
    .toggle-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 1.75rem; height: 1.75rem;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--secondary);
      color: var(--muted-foreground);
      cursor: pointer;
      transition: all 0.15s;
    }
    .toggle-btn:hover { color: var(--accent); border-color: var(--accent); }
    .toggle-btn.on {
      background: color-mix(in srgb, var(--accent) 15%, transparent);
      color: var(--accent);
      border-color: color-mix(in srgb, var(--accent) 40%, transparent);
    }

    .col-actions { display: flex; gap: 0.375rem; justify-content: flex-end; }

    .btn {
      display: inline-flex; align-items: center; gap: 0.375rem;
      padding: 0.5rem 0.875rem;
      border-radius: var(--radius);
      border: none;
      font-family: inherit;
      font-size: 0.8125rem; font-weight: 500;
      cursor: pointer;
      transition: opacity 0.15s, background-color 0.15s;
      white-space: nowrap;
    }
    .btn:disabled { opacity: 0.6; cursor: default; }
    .btn-xs { padding: 0.25rem 0.5rem; font-size: 0.6875rem; }
    .btn-primary { background: var(--primary); color: var(--primary-foreground); }
    .btn-primary:hover:not(:disabled) { opacity: 0.9; }
    .btn-outline { background: transparent; color: var(--foreground); border: 1px solid var(--border); }
    .btn-outline:hover { background: var(--secondary); }
    .btn-ghost { background: transparent; color: var(--muted-foreground); }
    .btn-ghost:hover { background: var(--secondary); color: var(--foreground); }
    .btn-danger {
      background: transparent;
      color: var(--destructive);
      border: 1px solid var(--destructive);
    }
    .btn-danger:hover:not(:disabled) {
      background: var(--destructive);
      color: var(--destructive-foreground);
    }

    /* Dialog */
    .dialog-backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.55);
      display: flex; align-items: center; justify-content: center;
      z-index: 50;
      padding: 1rem;
    }
    .dialog {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      width: 100%;
      max-width: 28rem;
      display: flex; flex-direction: column;
    }
    .dialog-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.875rem 1rem;
      border-bottom: 1px solid var(--border);
    }
    .dialog-title {
      margin: 0;
      display: inline-flex; align-items: center; gap: 0.5rem;
      font-size: 0.9375rem;
      font-weight: 600;
    }
    .dialog-close {
      background: transparent; border: none;
      color: var(--muted-foreground);
      cursor: pointer;
      padding: 0.25rem;
      border-radius: var(--radius);
    }
    .dialog-close:hover { background: var(--secondary); color: var(--foreground); }
    .dialog-body {
      padding: 1rem;
      display: flex; flex-direction: column; gap: 0.625rem;
      font-size: 0.8125rem;
    }
    .dialog-footer {
      padding: 0.75rem 1rem;
      border-top: 1px solid var(--border);
      display: flex; justify-content: flex-end; gap: 0.5rem;
    }
    .form-label {
      font-size: 0.6875rem; font-weight: 600;
      color: var(--muted-foreground); letter-spacing: 0.06em;
    }
    .form-select {
      height: 2.375rem;
      padding: 0 0.625rem;
      background: var(--input-background);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--foreground);
      font-size: 0.8125rem;
      font-family: inherit;
      outline: none;
    }
    .form-select:focus { border-color: var(--primary); }

    /* Moderation list */
    .mod-section { display: flex; flex-direction: column; gap: 0.5rem; }
    .section-title {
      display: inline-flex; align-items: center; gap: 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--muted-foreground);
      letter-spacing: 0.06em;
      margin: 0;
    }
    .mod-list {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .mod-row {
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      text-decoration: none;
      color: var(--foreground);
      transition: background-color 0.15s;
    }
    .mod-row:last-child { border-bottom: none; }
    .mod-row:hover { background: var(--secondary); }
    .mod-row-main {
      display: flex; flex-direction: column; gap: 0.125rem;
      min-width: 0;
      flex: 1;
    }
    .mod-title { font-weight: 500; }
    .mod-desc {
      color: var(--muted-foreground);
      font-size: 0.75rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .mod-row-meta { display: flex; gap: 0.375rem; flex-wrap: wrap; }
    .meta-chip {
      font-size: 0.6875rem;
      padding: 0.125rem 0.5rem;
      background: var(--secondary);
      color: var(--muted-foreground);
      border-radius: 999px;
    }

    /* Create tag inline form */
    .create-tag-row {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.625rem 0.875rem;
    }
    .create-tag-row .inline-input { flex: 1; }
    .create-tag-toggle {
      display: inline-flex; align-items: center; gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--muted-foreground);
      cursor: pointer;
      white-space: nowrap;
    }
    .create-tag-toggle input[type='checkbox'] {
      accent-color: var(--accent);
      cursor: pointer;
    }

    .muted { color: var(--muted-foreground); font-size: 0.8125rem; }
  `],
})
export class AdminComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly tagService = inject(TagService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly activeTab = signal<AdminTab>('stats');
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  // Stats
  readonly stats = signal<AdminStats | null>(null);

  // Tags
  readonly allTags = signal<AdminTag[]>([]);
  tagFilter = '';
  readonly filteredTags = computed(() => {
    const q = this.tagFilter.trim().toLowerCase();
    const tags = this.allTags();
    if (!q) return tags;
    return tags.filter(t => t.name.toLowerCase().includes(q));
  });
  readonly editingTagId = signal<string | null>(null);
  tagRenameDraft = '';
  readonly mergeSource = signal<AdminTag | null>(null);
  mergeTargetId: string | null = null;
  readonly showCreateTag = signal(false);
  newTagName = '';
  newTagOfficial = false;

  // Moderation
  readonly moderation = signal<AdminPublicContent | null>(null);
  moderationQuery = '';

  ngOnInit(): void {
    this.loadStats();
  }

  setTab(tab: AdminTab): void {
    this.activeTab.set(tab);
    this.errorMessage.set('');
    if (tab === 'stats' && !this.stats()) this.loadStats();
    if (tab === 'tags' && this.allTags().length === 0) this.loadTags();
    if (tab === 'moderation' && !this.moderation()) this.loadModeration();
  }

  // ---- Stats -------------------------------------------------------------

  private loadStats(): void {
    this.loading.set(true);
    this.adminService.stats().subscribe({
      next: s => {
        this.stats.set(s);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.showError('Failed to load stats', err);
      },
    });
  }

  // ---- Tags --------------------------------------------------------------

  private loadTags(): void {
    this.loading.set(true);
    this.tagService.adminList().subscribe({
      next: tags => {
        this.allTags.set(tags);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.showError('Failed to load tags', err);
      },
    });
  }

  createTag(): void {
    const name = this.newTagName.trim().toLowerCase();
    if (!name) return;
    this.tagService.adminCreate({ name, isOfficial: this.newTagOfficial }).subscribe({
      next: () => {
        this.cancelCreateTag();
        this.loadTags();
      },
      error: (err: HttpErrorResponse) => {
        this.showError(
          err.status === 409 ? 'A tag with this name already exists.' : 'Failed to create tag',
          err,
        );
      },
    });
  }

  cancelCreateTag(): void {
    this.showCreateTag.set(false);
    this.newTagName = '';
    this.newTagOfficial = false;
  }

  startTagRename(t: AdminTag): void {
    this.editingTagId.set(t.id);
    this.tagRenameDraft = t.name;
  }

  cancelTagRename(): void {
    this.editingTagId.set(null);
    this.tagRenameDraft = '';
  }

  saveTagRename(t: AdminTag): void {
    const next = this.tagRenameDraft.trim().toLowerCase();
    if (!next || next === t.name) {
      this.cancelTagRename();
      return;
    }
    this.tagService.adminUpdate(t.id, { name: next }).subscribe({
      next: () => {
        this.cancelTagRename();
        this.loadTags();
      },
      error: (err: HttpErrorResponse) => {
        this.showError(
          err.status === 409 ? 'A tag with this name already exists.' : 'Failed to rename tag',
          err,
        );
      },
    });
  }

  toggleOfficial(t: AdminTag): void {
    this.tagService.adminUpdate(t.id, { isOfficial: !t.isOfficial }).subscribe({
      next: () => {
        // Patch in place to avoid a full refetch flicker.
        this.allTags.update(list =>
          list.map(x => (x.id === t.id ? { ...x, isOfficial: !t.isOfficial } : x)),
        );
      },
      error: err => this.showError('Failed to toggle official flag', err),
    });
  }

  openMergeFor(t: AdminTag): void {
    this.mergeSource.set(t);
    this.mergeTargetId = null;
  }

  cancelMerge(): void {
    this.mergeSource.set(null);
    this.mergeTargetId = null;
  }

  async confirmMerge(): Promise<void> {
    const source = this.mergeSource();
    const targetId = this.mergeTargetId;
    if (!source || !targetId) return;
    const target = this.allTags().find(t => t.id === targetId);
    if (!target) return;
    if (!isPlatformBrowser(this.platformId)) return;

    const ok = await this.confirmDialog.confirm({
      title: `Merge "${source.name}" into "${target.name}"?`,
      message:
        `${source.usageCount} resource${source.usageCount === 1 ? '' : 's'} will be ` +
        `re-tagged. The "${source.name}" tag will then be deleted. This cannot be undone.`,
      confirmLabel: 'Merge',
      cancelLabel: 'Cancel',
      variant: 'destructive',
    });
    if (!ok) return;

    this.tagService.adminMerge(source.id, target.id).subscribe({
      next: () => {
        this.cancelMerge();
        this.loadTags();
      },
      error: err => this.showError('Failed to merge tags', err),
    });
  }

  async confirmDelete(t: AdminTag): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const ok = await this.confirmDialog.confirm({
      title: `Delete tag "${t.name}"?`,
      message:
        t.usageCount > 0
          ? `This tag is used by ${t.usageCount} resource${t.usageCount === 1 ? '' : 's'}. ` +
            'Deleting it will detach the tag from every concept and payload.'
          : 'This tag is unused. Deletion is safe.',
      confirmLabel: 'Delete tag',
      cancelLabel: 'Cancel',
      variant: 'destructive',
    });
    if (!ok) return;

    this.tagService.adminDelete(t.id).subscribe({
      next: () => this.loadTags(),
      error: err => this.showError('Failed to delete tag', err),
    });
  }

  // ---- Moderation --------------------------------------------------------

  loadModeration(): void {
    this.loading.set(true);
    this.adminService.publicContent(this.moderationQuery).subscribe({
      next: data => {
        this.moderation.set(data);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.showError('Failed to load moderation list', err);
      },
    });
  }

  private showError(label: string, err?: HttpErrorResponse): void {
    const detail = err?.error?.message ?? err?.message ?? '';
    this.errorMessage.set(detail ? `${label}: ${detail}` : label);
    setTimeout(() => this.errorMessage.set(''), 5000);
  }
}
