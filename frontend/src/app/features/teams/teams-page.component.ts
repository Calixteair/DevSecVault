import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import {
  LUCIDE_ICONS,
  LucideAngularModule,
  LucideIconProvider,
  AlertTriangle,
  Check,
  Code2,
  Copy,
  Crown,
  Edit3,
  Link2,
  LogOut,
  Plus,
  RefreshCw,
  Shield,
  Terminal,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-angular';
import { TeamService } from '../../core/services/team.service';
import { ConceptService } from '../../core/services/concept.service';
import { PayloadService } from '../../core/services/payload.service';
import { AuthService } from '../../core/services/auth.service';
import {
  TeamDetail,
  TeamInviteLink,
  TeamResources,
  TeamSharedResource,
  TeamSummary,
} from '../../core/models/team.model';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { TagPillComponent } from '../../shared/components/tag-pill/tag-pill.component';

const icons = {
  AlertTriangle,
  Check,
  Code2,
  Copy,
  Crown,
  Edit3,
  Link2,
  LogOut,
  Plus,
  RefreshCw,
  Shield,
  Terminal,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
};

const MAX_MEMBERS = 5;

type InviteExpiryChoice = 1 | 7 | 30;

@Component({
  selector: 'app-teams-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TagPillComponent],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <div class="teams-page">
      <header class="page-header">
        <div class="page-header-icon">
          <lucide-icon name="users" [size]="22" [strokeWidth]="2"></lucide-icon>
        </div>
        <div class="page-header-text">
          <h1 class="page-title">TEAMS</h1>
          <p class="page-subtitle">Share resources with trusted collaborators</p>
        </div>
        <div class="page-header-actions">
          <button
            type="button"
            class="btn btn-primary"
            (click)="toggleCreateForm()"
            [disabled]="busy()"
          >
            <lucide-icon [name]="showCreateForm() ? 'x' : 'plus'" [size]="16" [strokeWidth]="2"></lucide-icon>
            {{ showCreateForm() ? 'Cancel' : 'Create team' }}
          </button>
        </div>
      </header>

      @if (showCreateForm()) {
        <section class="create-form card">
          <label class="label font-mono">Team name</label>
          <div class="create-row">
            <input
              class="input font-mono"
              type="text"
              maxlength="80"
              placeholder="e.g. Red Team Core"
              [(ngModel)]="newTeamName"
              (keyup.enter)="onCreateTeam()"
            />
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="busy() || newTeamName().trim().length < 2"
              (click)="onCreateTeam()"
            >
              <lucide-icon name="check" [size]="16" [strokeWidth]="2"></lucide-icon>
              Create
            </button>
          </div>
          @if (createError()) {
            <p class="error-line"><lucide-icon name="alert-triangle" [size]="14"></lucide-icon> {{ createError() }}</p>
          }
        </section>
      }

      @if (loadingList()) {
        <p class="status-line">Loading teams…</p>
      } @else if (teams().length === 0 && !showCreateForm()) {
        <div class="empty-state card">
          <lucide-icon name="users" [size]="28" [strokeWidth]="2"></lucide-icon>
          <h2>You're not in any team yet</h2>
          <p>Create a team to start sharing your snippets and payloads.</p>
          <button type="button" class="btn btn-primary" (click)="toggleCreateForm()">
            <lucide-icon name="plus" [size]="16" [strokeWidth]="2"></lucide-icon>
            Create a team
          </button>
        </div>
      } @else {
        <div class="layout">
          <!-- Left column: team list -->
          <aside class="team-list card">
            <header class="card-sub-header">
              <h2 class="card-heading font-mono">MY TEAMS</h2>
              <span class="muted-count">{{ teams().length }}/10</span>
            </header>
            <ul class="team-list-items">
              @for (t of teams(); track t.id) {
                <li>
                  <button
                    type="button"
                    class="team-list-btn"
                    [class.active]="t.id === selectedTeamId()"
                    (click)="selectTeam(t.id)"
                  >
                    <div class="team-list-btn-main">
                      <span class="team-list-name">{{ t.name }}</span>
                      <span class="team-list-role-badge" [class.lead]="t.role === 'lead'">
                        @if (t.role === 'lead') {
                          <lucide-icon name="crown" [size]="10"></lucide-icon> LEAD
                        } @else {
                          MEMBER
                        }
                      </span>
                    </div>
                    <span class="team-list-count font-mono">{{ t.memberCount }}/{{ maxMembers }}</span>
                  </button>
                </li>
              }
            </ul>
          </aside>

          <!-- Right column: selected team detail -->
          <section class="team-detail">
            @if (!selectedTeamId()) {
              <div class="empty-selection card">
                <lucide-icon name="shield" [size]="24" [strokeWidth]="2"></lucide-icon>
                <p>Select a team to see details.</p>
              </div>
            } @else if (loadingDetail()) {
              <p class="status-line">Loading team…</p>
            } @else if (detailError()) {
              <p class="error-line">
                <lucide-icon name="alert-triangle" [size]="14"></lucide-icon>
                {{ detailError() }}
              </p>
            } @else if (detail(); as d) {
              <!-- Team header -->
              <div class="card detail-header">
                <div class="detail-header-main">
                  @if (renaming()) {
                    <input
                      class="input font-mono detail-rename-input"
                      type="text"
                      maxlength="80"
                      [(ngModel)]="renameValue"
                      (keyup.enter)="onCommitRename(d)"
                      (keyup.escape)="onCancelRename()"
                    />
                    <button type="button" class="btn btn-primary" (click)="onCommitRename(d)" [disabled]="busy()">
                      <lucide-icon name="check" [size]="14"></lucide-icon>
                    </button>
                    <button type="button" class="btn btn-ghost" (click)="onCancelRename()" [disabled]="busy()">
                      <lucide-icon name="x" [size]="14"></lucide-icon>
                    </button>
                  } @else {
                    <h2 class="detail-title">{{ d.name }}</h2>
                    @if (isLead(d)) {
                      <button type="button" class="icon-btn" title="Rename team" (click)="onStartRename(d)">
                        <lucide-icon name="edit-3" [size]="14" [strokeWidth]="2"></lucide-icon>
                      </button>
                    }
                  }
                  <span class="detail-meta font-mono">
                    {{ d.members.length }} / {{ maxMembers }} members
                  </span>
                </div>
                <div class="detail-header-actions">
                  @if (isLead(d)) {
                    <button
                      type="button"
                      class="btn btn-destructive"
                      (click)="onDeleteTeam(d)"
                      [disabled]="busy()"
                    >
                      <lucide-icon name="trash-2" [size]="14" [strokeWidth]="2"></lucide-icon>
                      Delete team
                    </button>
                  } @else {
                    <button
                      type="button"
                      class="btn btn-ghost"
                      (click)="onLeaveTeam(d)"
                      [disabled]="busy()"
                    >
                      <lucide-icon name="log-out" [size]="14" [strokeWidth]="2"></lucide-icon>
                      Leave team
                    </button>
                  }
                </div>
              </div>

              @if (renameError()) {
                <p class="error-line"><lucide-icon name="alert-triangle" [size]="14"></lucide-icon> {{ renameError() }}</p>
              }

              <!-- Members table -->
              <section class="card">
                <header class="card-sub-header">
                  <h2 class="card-heading font-mono">
                    <lucide-icon name="users" [size]="16" [strokeWidth]="2"></lucide-icon>
                    MEMBERS
                  </h2>
                  <span class="muted-count">{{ d.members.length }}/{{ maxMembers }}</span>
                </header>
                <div class="members-table">
                  <div class="members-header font-mono">
                    <span>Name</span>
                    <span>Email</span>
                    <span>Role</span>
                    <span>Joined</span>
                    <span>Actions</span>
                  </div>
                  @for (m of d.members; track m.id) {
                    <div class="member-row">
                      <div class="member-name">
                        <span class="avatar">{{ initial(m.user.displayName) }}</span>
                        <span>{{ m.user.displayName }}</span>
                      </div>
                      <div class="member-email muted">{{ m.user.email }}</div>
                      <div>
                        <span class="role-badge" [class.lead]="m.role === 'lead'">
                          @if (m.role === 'lead') {
                            <lucide-icon name="crown" [size]="10"></lucide-icon> LEAD
                          } @else {
                            MEMBER
                          }
                        </span>
                      </div>
                      <div class="muted font-mono member-joined">{{ formatDate(m.joinedAt) }}</div>
                      <div class="member-actions">
                        @if (isLead(d) && m.role !== 'lead') {
                          <button
                            type="button"
                            class="icon-btn"
                            title="Transfer lead to this member"
                            (click)="onTransferLead(d, m.user.id, m.user.displayName)"
                            [disabled]="busy()"
                          >
                            <lucide-icon name="crown" [size]="14"></lucide-icon>
                          </button>
                          <button
                            type="button"
                            class="icon-btn destructive"
                            title="Kick member"
                            (click)="onKickMember(d, m.user.id, m.user.displayName)"
                            [disabled]="busy()"
                          >
                            <lucide-icon name="user-minus" [size]="14"></lucide-icon>
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              </section>

              <!-- Invite links (lead only) -->
              @if (isLead(d)) {
                <section class="card">
                  <header class="card-sub-header">
                    <h2 class="card-heading font-mono">
                      <lucide-icon name="link-2" [size]="16" [strokeWidth]="2"></lucide-icon>
                      INVITE LINKS
                    </h2>
                  </header>

                  @if (teamFull(d)) {
                    <p class="notice-line">
                      <lucide-icon name="alert-triangle" [size]="14"></lucide-icon>
                      Team is full — no more invites. Kick a member first if needed.
                    </p>
                  }

                  <div class="invite-form">
                    <label class="label font-mono">Valid for</label>
                    <div class="invite-ttl-row">
                      @for (choice of ttlChoices; track choice) {
                        <label class="ttl-radio" [class.active]="newInviteTtl() === choice">
                          <input
                            type="radio"
                            name="ttl"
                            [value]="choice"
                            [checked]="newInviteTtl() === choice"
                            (change)="newInviteTtl.set(choice)"
                          />
                          {{ choice }} day{{ choice > 1 ? 's' : '' }}
                        </label>
                      }
                      <button
                        type="button"
                        class="btn btn-primary"
                        (click)="onCreateInviteLink(d)"
                        [disabled]="busy() || teamFull(d)"
                      >
                        <lucide-icon name="user-plus" [size]="14" [strokeWidth]="2"></lucide-icon>
                        Generate invite link
                      </button>
                    </div>
                  </div>

                  @if (inviteError()) {
                    <p class="error-line"><lucide-icon name="alert-triangle" [size]="14"></lucide-icon> {{ inviteError() }}</p>
                  }

                  @if (d.inviteLinks.length === 0) {
                    <p class="muted status-line">No invite links yet.</p>
                  } @else {
                    <ul class="invite-list">
                      @for (link of d.inviteLinks; track link.id) {
                        <li class="invite-item">
                          <div class="invite-url font-mono" [class.stale]="!isLinkActive(link)">
                            {{ buildInviteUrl(link.id) }}
                          </div>
                          <div class="invite-meta">
                            <span class="invite-state-badge" [class.active]="isLinkActive(link)" [class.stale]="!isLinkActive(link)">
                              {{ linkState(link) }}
                            </span>
                            <span class="muted font-mono invite-expiry">{{ formatRelative(link.expiresAt) }}</span>
                          </div>
                          <div class="invite-actions">
                            <button
                              type="button"
                              class="icon-btn"
                              title="Copy invite link"
                              (click)="copyInviteLink(link.id)"
                              [disabled]="!isLinkActive(link)"
                            >
                              <lucide-icon [name]="copiedToken() === link.id ? 'check' : 'copy'" [size]="14"></lucide-icon>
                            </button>
                            @if (isLinkActive(link)) {
                              <button
                                type="button"
                                class="icon-btn"
                                title="Revoke invite link"
                                (click)="onRevokeLink(d, link)"
                                [disabled]="busy()"
                              >
                                <lucide-icon name="x" [size]="14"></lucide-icon>
                              </button>
                            }
                            <button
                              type="button"
                              class="icon-btn destructive"
                              title="Delete invite link"
                              (click)="onDeleteLink(d, link)"
                              [disabled]="busy()"
                            >
                              <lucide-icon name="trash-2" [size]="14"></lucide-icon>
                            </button>
                          </div>
                        </li>
                      }
                    </ul>
                  }
                </section>
              }

              <!-- Shared resources -->
              <section class="card">
                <header class="card-sub-header">
                  <h2 class="card-heading font-mono">
                    <lucide-icon name="shield" [size]="16" [strokeWidth]="2"></lucide-icon>
                    SHARED RESOURCES
                  </h2>
                  <button type="button" class="icon-btn" (click)="reloadResources()" title="Refresh resources" [disabled]="loadingResources()">
                    <lucide-icon name="refresh-cw" [size]="14"></lucide-icon>
                  </button>
                </header>

                @if (loadingResources()) {
                  <p class="status-line">Loading resources…</p>
                } @else if (resourcesError()) {
                  <p class="error-line"><lucide-icon name="alert-triangle" [size]="14"></lucide-icon> {{ resourcesError() }}</p>
                } @else if (resources(); as r) {
                  <div class="resources-grid">
                    <div>
                      <h3 class="resources-subheading font-mono">
                        <lucide-icon name="code-2" [size]="13" [strokeWidth]="2"></lucide-icon>
                        CONCEPTS <span class="muted-count">{{ r.concepts.length }}</span>
                      </h3>
                      @if (r.concepts.length === 0) {
                        <p class="muted status-line">No shared concepts.</p>
                      } @else {
                        <ul class="resource-list">
                          @for (c of r.concepts; track resourceKey(c)) {
                            <li class="resource-card">
                              <div class="resource-card-body">
                                <span class="resource-title">{{ resourceTitle(c) }}</span>
                                <span class="resource-owner muted font-mono">by {{ resourceOwner(c) }}</span>
                                @if (resourceTags(c).length) {
                                  <div class="resource-tags">
                                    @for (tag of resourceTags(c); track tag.name) {
                                      <app-tag-pill [name]="tag.name" [isOfficial]="tag.isOfficial" />
                                    }
                                  </div>
                                }
                              </div>
                              @if (isLead(d)) {
                                <button
                                  type="button"
                                  class="resource-unshare-btn"
                                  title="Unshare from team"
                                  (click)="onUnshareConcept(d, c)"
                                  [disabled]="busy()"
                                >
                                  <lucide-icon name="x" [size]="14" [strokeWidth]="2.2"></lucide-icon>
                                </button>
                              }
                            </li>
                          }
                        </ul>
                      }
                    </div>
                    <div>
                      <h3 class="resources-subheading font-mono">
                        <lucide-icon name="terminal" [size]="13" [strokeWidth]="2"></lucide-icon>
                        PAYLOADS <span class="muted-count">{{ r.payloads.length }}</span>
                      </h3>
                      @if (r.payloads.length === 0) {
                        <p class="muted status-line">No shared payloads.</p>
                      } @else {
                        <ul class="resource-list">
                          @for (p of r.payloads; track resourceKey(p)) {
                            <li class="resource-card">
                              <div class="resource-card-body">
                                <span class="resource-title">{{ resourceTitle(p) }}</span>
                                <span class="resource-owner muted font-mono">by {{ resourceOwner(p) }}</span>
                                @if (resourceTags(p).length) {
                                  <div class="resource-tags">
                                    @for (tag of resourceTags(p); track tag.name) {
                                      <app-tag-pill [name]="tag.name" [isOfficial]="tag.isOfficial" />
                                    }
                                  </div>
                                }
                              </div>
                              @if (isLead(d)) {
                                <button
                                  type="button"
                                  class="resource-unshare-btn"
                                  title="Unshare from team"
                                  (click)="onUnsharePayload(d, p)"
                                  [disabled]="busy()"
                                >
                                  <lucide-icon name="x" [size]="14" [strokeWidth]="2.2"></lucide-icon>
                                </button>
                              }
                            </li>
                          }
                        </ul>
                      }
                    </div>
                  </div>
                }
              </section>
            }
          </section>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .teams-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1.5rem 0 3rem;
      display: flex; flex-direction: column; gap: 1.25rem;
    }

    .page-header {
      display: flex; align-items: center; gap: 0.875rem;
    }
    .page-header-icon {
      width: 40px; height: 40px; border-radius: var(--radius);
      background: color-mix(in srgb, var(--primary) 14%, transparent);
      color: var(--primary);
      display: flex; align-items: center; justify-content: center;
      border: 1px solid color-mix(in srgb, var(--primary) 35%, transparent);
    }
    .page-header-text { flex: 1; }
    .page-title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 1.25rem; font-weight: 700; letter-spacing: 0.08em;
      color: var(--primary); margin: 0;
    }
    .page-subtitle { margin: 0.125rem 0 0; font-size: 0.875rem; color: var(--muted-foreground); }

    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.25rem;
      display: flex; flex-direction: column; gap: 0.75rem;
    }

    .card-sub-header {
      display: flex; align-items: center; justify-content: space-between;
      gap: 0.75rem;
    }
    .card-heading {
      display: inline-flex; align-items: center; gap: 0.5rem;
      font-size: 0.75rem; font-weight: 700;
      letter-spacing: 0.08em; text-transform: uppercase;
      color: var(--foreground); margin: 0;
    }
    .muted-count { font-size: 0.75rem; color: var(--muted-foreground); font-family: 'JetBrains Mono', monospace; }

    .create-form { gap: 0.5rem; }
    .create-row { display: flex; gap: 0.5rem; }
    .create-row .input { flex: 1; }

    .empty-state {
      align-items: center; text-align: center; padding: 2.5rem 1.5rem;
      color: var(--muted-foreground);
    }
    .empty-state h2 { color: var(--foreground); margin: 0.5rem 0 0; font-size: 1rem; }
    .empty-state p { margin: 0.25rem 0 0.75rem; font-size: 0.875rem; }

    .layout {
      display: grid;
      grid-template-columns: 16rem 1fr;
      gap: 1rem;
      align-items: start;
    }
    @media (max-width: 860px) {
      .layout { grid-template-columns: 1fr; }
    }

    .team-list-items {
      list-style: none; padding: 0; margin: 0;
      display: flex; flex-direction: column; gap: 0.25rem;
    }
    .team-list-btn {
      width: 100%;
      display: flex; align-items: center; justify-content: space-between;
      gap: 0.5rem;
      padding: 0.625rem 0.75rem;
      background: transparent;
      border: 1px solid transparent;
      border-radius: calc(var(--radius) - 2px);
      color: var(--foreground);
      cursor: pointer; text-align: left;
      transition: background-color 0.12s, border-color 0.12s, color 0.12s;
    }
    .team-list-btn:hover { background: var(--secondary); }
    .team-list-btn.active {
      background: color-mix(in srgb, var(--primary) 14%, transparent);
      border-color: color-mix(in srgb, var(--primary) 40%, transparent);
      color: var(--primary);
    }
    .team-list-btn-main {
      display: flex; flex-direction: column; align-items: flex-start; gap: 0.25rem;
      min-width: 0;
    }
    .team-list-name {
      font-size: 0.875rem; font-weight: 600;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      max-width: 9.5rem;
    }
    .team-list-role-badge, .role-badge {
      display: inline-flex; align-items: center; gap: 0.25rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.625rem; letter-spacing: 0.08em;
      padding: 0.125rem 0.375rem;
      border-radius: 999px;
      background: var(--secondary);
      color: var(--muted-foreground);
    }
    .team-list-role-badge.lead, .role-badge.lead {
      background: color-mix(in srgb, var(--accent) 18%, transparent);
      color: var(--accent);
    }
    .team-list-count { font-size: 0.6875rem; color: var(--muted-foreground); }

    .detail-header {
      flex-direction: row; align-items: center; justify-content: space-between;
      gap: 0.75rem;
    }
    .detail-header-main { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .detail-title { margin: 0; font-size: 1.125rem; font-weight: 600; color: var(--foreground); }
    .detail-meta { font-size: 0.75rem; color: var(--muted-foreground); padding: 0.125rem 0.5rem; background: var(--secondary); border-radius: 999px; }
    .detail-rename-input { max-width: 18rem; }
    .detail-header-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }

    .members-table { display: flex; flex-direction: column; gap: 0.25rem; }
    .members-header {
      display: grid;
      grid-template-columns: 1.5fr 1.5fr 0.8fr 0.8fr 0.8fr;
      gap: 0.5rem;
      padding: 0.375rem 0.5rem;
      font-size: 0.625rem; letter-spacing: 0.08em;
      color: var(--muted-foreground); text-transform: uppercase;
      border-bottom: 1px solid var(--border);
    }
    .member-row {
      display: grid;
      grid-template-columns: 1.5fr 1.5fr 0.8fr 0.8fr 0.8fr;
      gap: 0.5rem;
      align-items: center;
      padding: 0.5rem 0.5rem;
      border-radius: calc(var(--radius) - 2px);
      font-size: 0.875rem;
      transition: background-color 0.12s;
    }
    .member-row:hover { background: var(--secondary); }
    .member-name { display: flex; align-items: center; gap: 0.5rem; min-width: 0; }
    .avatar {
      display: inline-flex; align-items: center; justify-content: center;
      width: 1.75rem; height: 1.75rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--primary) 18%, transparent);
      color: var(--primary);
      font-size: 0.75rem; font-weight: 700;
      flex-shrink: 0;
    }
    .member-email { font-size: 0.8125rem; word-break: break-all; }
    .member-joined { font-size: 0.75rem; }
    .member-actions { display: flex; gap: 0.25rem; justify-content: flex-start; }

    @media (max-width: 720px) {
      .members-header { display: none; }
      .member-row {
        grid-template-columns: 1fr;
        gap: 0.375rem;
        border: 1px solid var(--border);
        padding: 0.625rem;
      }
    }

    .invite-form { display: flex; flex-direction: column; gap: 0.375rem; }
    .invite-ttl-row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .ttl-radio {
      display: inline-flex; align-items: center; gap: 0.375rem;
      padding: 0.375rem 0.625rem;
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) - 2px);
      font-size: 0.8125rem;
      cursor: pointer;
      color: var(--foreground);
      background: transparent;
      transition: background-color 0.12s, border-color 0.12s, color 0.12s;
    }
    .ttl-radio input { accent-color: var(--primary); margin: 0; }
    .ttl-radio.active {
      background: color-mix(in srgb, var(--primary) 12%, transparent);
      border-color: color-mix(in srgb, var(--primary) 45%, transparent);
      color: var(--primary);
    }

    .invite-list {
      list-style: none; padding: 0; margin: 0;
      display: flex; flex-direction: column; gap: 0.375rem;
    }
    .invite-item {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 0.5rem; align-items: center;
      padding: 0.5rem 0.625rem;
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) - 2px);
      background: color-mix(in srgb, var(--secondary) 40%, transparent);
    }
    .invite-url {
      font-size: 0.75rem;
      word-break: break-all;
      color: var(--foreground);
    }
    .invite-url.stale { color: var(--muted-foreground); text-decoration: line-through; }
    .invite-meta { display: inline-flex; align-items: center; gap: 0.5rem; }
    .invite-expiry { font-size: 0.6875rem; }
    .invite-state-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.625rem; letter-spacing: 0.08em;
      padding: 0.125rem 0.375rem; border-radius: 999px;
      background: var(--secondary); color: var(--muted-foreground);
    }
    .invite-state-badge.active {
      background: color-mix(in srgb, var(--primary) 18%, transparent);
      color: var(--primary);
    }
    .invite-actions { display: flex; gap: 0.25rem; }

    @media (max-width: 640px) {
      .invite-item { grid-template-columns: 1fr; }
      .invite-actions { justify-content: flex-end; }
    }

    .resources-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 720px) {
      .resources-grid { grid-template-columns: 1fr; }
    }
    .resources-subheading {
      display: flex; align-items: center; justify-content: space-between;
      margin: 0 0 0.5rem;
      font-size: 0.6875rem; letter-spacing: 0.08em; color: var(--muted-foreground);
    }
    .resource-list {
      list-style: none; padding: 0; margin: 0;
      display: flex; flex-direction: column; gap: 0.375rem;
    }
    .resource-card {
      position: relative;
      display: flex; align-items: flex-start; gap: 0.5rem;
      padding: 0.5rem 0.625rem;
      border: 1px solid var(--border); border-radius: calc(var(--radius) - 2px);
      background: color-mix(in srgb, var(--secondary) 30%, transparent);
      transition: border-color 0.15s, background-color 0.15s, transform 0.15s;
    }
    .resource-card:hover {
      border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
      background: color-mix(in srgb, var(--secondary) 45%, transparent);
    }
    .resource-card-body {
      display: flex; flex-direction: column; gap: 0.25rem;
      flex: 1; min-width: 0;
    }
    .resource-unshare-btn {
      flex-shrink: 0;
      display: inline-flex; align-items: center; justify-content: center;
      width: 1.5rem; height: 1.5rem;
      background: transparent;
      color: var(--muted-foreground);
      border: 1px solid transparent;
      border-radius: calc(var(--radius) - 3px);
      cursor: pointer;
      opacity: 0;
      transform: translateY(-1px);
      transition: opacity 0.15s ease, color 0.12s, background-color 0.12s,
                  border-color 0.12s, transform 0.15s;
    }
    .resource-card:hover .resource-unshare-btn,
    .resource-card:focus-within .resource-unshare-btn {
      opacity: 1;
    }
    .resource-unshare-btn:hover:not(:disabled) {
      background: color-mix(in srgb, var(--destructive) 14%, transparent);
      color: var(--destructive);
      border-color: color-mix(in srgb, var(--destructive) 40%, transparent);
    }
    .resource-unshare-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Always reveal on coarse-pointer devices (mobile, touch) where hover is unreliable */
    @media (hover: none) {
      .resource-unshare-btn { opacity: 1; }
    }

    .resource-title { font-weight: 600; font-size: 0.875rem; word-break: break-word; }
    .resource-owner { font-size: 0.75rem; }
    .resource-tags { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.125rem; }
    .tag-pill {
      font-size: 0.6875rem; padding: 0.125rem 0.375rem;
      background: color-mix(in srgb, var(--primary) 10%, transparent);
      color: var(--primary); border-radius: 999px;
    }

    /* Shared form + button classes --------------------------------------- */
    .label { font-size: 0.75rem; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.04em; }
    .input {
      width: 100%; padding: 0.5rem 0.75rem;
      background: var(--input-background); border: 1px solid var(--border);
      border-radius: var(--radius); color: var(--foreground);
      font-size: 0.875rem;
      box-sizing: border-box;
      transition: border-color 0.15s;
    }
    .input.font-mono { font-family: 'JetBrains Mono', monospace; }
    .input:focus { outline: none; border-color: var(--primary); }

    .btn {
      display: inline-flex; align-items: center; gap: 0.375rem;
      padding: 0.5rem 0.875rem;
      font-size: 0.8125rem; font-weight: 500;
      border-radius: calc(var(--radius) - 2px); border: 1px solid transparent;
      cursor: pointer; transition: all 0.15s;
      background: var(--secondary); color: var(--foreground);
    }
    .btn:hover:not(:disabled) { background: color-mix(in srgb, var(--secondary) 70%, var(--foreground) 10%); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary {
      background: var(--primary); color: var(--primary-foreground); border-color: var(--primary);
    }
    .btn-primary:hover:not(:disabled) {
      background: color-mix(in srgb, var(--primary) 88%, #000);
    }
    .btn-ghost { background: transparent; border-color: var(--border); }
    .btn-destructive {
      background: var(--destructive); color: var(--destructive-foreground, #fff);
      border-color: var(--destructive);
    }
    .btn-destructive:hover:not(:disabled) {
      background: color-mix(in srgb, var(--destructive) 88%, #000);
    }

    .icon-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 1.75rem; height: 1.75rem;
      background: transparent; color: var(--muted-foreground);
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) - 3px);
      cursor: pointer;
      transition: background-color 0.12s, color 0.12s, border-color 0.12s;
    }
    .icon-btn:hover:not(:disabled) {
      background: var(--secondary); color: var(--foreground);
    }
    .icon-btn.destructive:hover:not(:disabled) {
      background: color-mix(in srgb, var(--destructive) 12%, transparent);
      color: var(--destructive); border-color: color-mix(in srgb, var(--destructive) 35%, transparent);
    }
    .icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .status-line { font-size: 0.875rem; color: var(--muted-foreground); margin: 0; }
    .error-line {
      display: inline-flex; align-items: center; gap: 0.375rem;
      color: var(--destructive); font-size: 0.8125rem; margin: 0;
    }
    .notice-line {
      display: inline-flex; align-items: center; gap: 0.375rem;
      padding: 0.5rem 0.75rem;
      background: color-mix(in srgb, var(--accent) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
      border-radius: calc(var(--radius) - 2px);
      color: var(--accent);
      font-size: 0.8125rem; margin: 0;
    }
    .muted { color: var(--muted-foreground); }
    .font-mono { font-family: 'JetBrains Mono', monospace; }

    .empty-selection {
      align-items: center; text-align: center; padding: 2.5rem 1.5rem;
      color: var(--muted-foreground);
    }
  `],
})
export class TeamsPageComponent implements OnInit {
  private readonly teamService = inject(TeamService);
  private readonly conceptService = inject(ConceptService);
  private readonly payloadService = inject(PayloadService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly maxMembers = MAX_MEMBERS;
  readonly ttlChoices: InviteExpiryChoice[] = [1, 7, 30];

  // --- State ---------------------------------------------------------------
  readonly busy = signal(false);
  readonly teams = signal<TeamSummary[]>([]);
  readonly loadingList = signal(false);
  readonly selectedTeamId = signal<string | null>(null);
  readonly detail = signal<TeamDetail | null>(null);
  readonly loadingDetail = signal(false);
  readonly detailError = signal<string | null>(null);
  readonly resources = signal<TeamResources | null>(null);
  readonly loadingResources = signal(false);
  readonly resourcesError = signal<string | null>(null);

  readonly showCreateForm = signal(false);
  readonly newTeamName = signal('');
  readonly createError = signal<string | null>(null);

  readonly renaming = signal(false);
  readonly renameValue = signal('');
  readonly renameError = signal<string | null>(null);

  readonly newInviteTtl = signal<InviteExpiryChoice>(7);
  readonly inviteError = signal<string | null>(null);
  readonly copiedToken = signal<string | null>(null);

  private currentUserId: string | null = null;

  ngOnInit(): void {
    this.auth.userData$.subscribe(user => {
      // We match the API `owner.id` / `member.user.id` shape — the Keycloak
      // `sub` claim is what the backend uses as the primary key for users.
      this.currentUserId = user ? (user as unknown as { username: string }).username : null;
    });
    this.reloadTeams();
  }

  // --- List / selection ----------------------------------------------------

  reloadTeams(preserveSelection = true): void {
    this.loadingList.set(true);
    this.teamService.list().subscribe({
      next: list => {
        this.teams.set(list);
        this.loadingList.set(false);
        if (preserveSelection) {
          const current = this.selectedTeamId();
          if (current && !list.find(t => t.id === current)) {
            this.selectedTeamId.set(null);
            this.detail.set(null);
            this.resources.set(null);
          }
          // Auto-select the first team if nothing is selected yet.
          if (!this.selectedTeamId() && list.length > 0) {
            this.selectTeam(list[0].id);
          }
        }
      },
      error: () => {
        this.loadingList.set(false);
        this.teams.set([]);
      },
    });
  }

  selectTeam(id: string): void {
    if (this.selectedTeamId() === id) return;
    this.selectedTeamId.set(id);
    this.detail.set(null);
    this.resources.set(null);
    this.detailError.set(null);
    this.renaming.set(false);
    this.loadDetail(id);
    this.loadResources(id);
  }

  private loadDetail(id: string): void {
    this.loadingDetail.set(true);
    this.detailError.set(null);
    this.teamService.get(id).subscribe({
      next: d => {
        this.detail.set(d);
        this.loadingDetail.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loadingDetail.set(false);
        this.detailError.set(this.describeHttpError(err));
      },
    });
  }

  private loadResources(id: string): void {
    this.loadingResources.set(true);
    this.resourcesError.set(null);
    this.teamService.resources(id).subscribe({
      next: r => {
        this.resources.set(r);
        this.loadingResources.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loadingResources.set(false);
        this.resourcesError.set(this.describeHttpError(err));
      },
    });
  }

  reloadResources(): void {
    const id = this.selectedTeamId();
    if (id) this.loadResources(id);
  }

  // --- Create --------------------------------------------------------------

  toggleCreateForm(): void {
    this.showCreateForm.set(!this.showCreateForm());
    this.newTeamName.set('');
    this.createError.set(null);
  }

  onCreateTeam(): void {
    const name = this.newTeamName().trim();
    if (name.length < 2) return;
    this.busy.set(true);
    this.createError.set(null);
    this.teamService.create(name).subscribe({
      next: team => {
        this.busy.set(false);
        this.showCreateForm.set(false);
        this.newTeamName.set('');
        this.reloadTeams(false);
        this.selectTeam(team.id);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.createError.set(this.describeHttpError(err));
      },
    });
  }

  // --- Rename --------------------------------------------------------------

  onStartRename(d: TeamDetail): void {
    this.renameValue.set(d.name);
    this.renameError.set(null);
    this.renaming.set(true);
  }

  onCancelRename(): void {
    this.renaming.set(false);
    this.renameValue.set('');
    this.renameError.set(null);
  }

  onCommitRename(d: TeamDetail): void {
    const name = this.renameValue().trim();
    if (name.length < 2 || name === d.name) {
      this.renaming.set(false);
      return;
    }
    this.busy.set(true);
    this.teamService.rename(d.id, name).subscribe({
      next: () => {
        this.busy.set(false);
        this.renaming.set(false);
        this.loadDetail(d.id);
        this.reloadTeams();
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.renameError.set(this.describeHttpError(err));
      },
    });
  }

  // --- Destructive team actions -------------------------------------------

  async onDeleteTeam(d: TeamDetail): Promise<void> {
    const ok = await this.confirm.confirm({
      title: `Delete team "${d.name}"?`,
      message: 'All memberships and invite links will be destroyed. Shared resources will revert to private ownership. This cannot be undone.',
      confirmLabel: 'Delete team',
      variant: 'destructive',
    });
    if (!ok) return;

    this.busy.set(true);
    this.teamService.delete(d.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.selectedTeamId.set(null);
        this.detail.set(null);
        this.resources.set(null);
        this.reloadTeams(false);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.detailError.set(this.describeHttpError(err));
      },
    });
  }

  async onLeaveTeam(d: TeamDetail): Promise<void> {
    const ok = await this.confirm.confirm({
      title: `Leave "${d.name}"?`,
      message: "You'll lose access to resources shared with this team. The lead can invite you back later.",
      confirmLabel: 'Leave team',
      variant: 'destructive',
    });
    if (!ok) return;

    this.busy.set(true);
    this.teamService.leave(d.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.selectedTeamId.set(null);
        this.detail.set(null);
        this.resources.set(null);
        this.reloadTeams(false);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.detailError.set(this.describeHttpError(err));
      },
    });
  }

  async onTransferLead(d: TeamDetail, userId: string, displayName: string): Promise<void> {
    const ok = await this.confirm.confirm({
      title: `Transfer lead to ${displayName}?`,
      message: "You'll become a regular member. Only the new lead can promote you back.",
      confirmLabel: 'Transfer lead',
      variant: 'destructive',
    });
    if (!ok) return;

    this.busy.set(true);
    this.teamService.transferLead(d.id, userId).subscribe({
      next: () => {
        this.busy.set(false);
        this.loadDetail(d.id);
        this.reloadTeams();
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.detailError.set(this.describeHttpError(err));
      },
    });
  }

  async onKickMember(d: TeamDetail, userId: string, displayName: string): Promise<void> {
    const ok = await this.confirm.confirm({
      title: `Kick ${displayName}?`,
      message: 'They will lose access to resources shared with this team. You can invite them back later.',
      confirmLabel: 'Kick member',
      variant: 'destructive',
    });
    if (!ok) return;

    this.busy.set(true);
    this.teamService.kick(d.id, userId).subscribe({
      next: () => {
        this.busy.set(false);
        this.loadDetail(d.id);
        this.reloadTeams();
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.detailError.set(this.describeHttpError(err));
      },
    });
  }

  // --- Invite links --------------------------------------------------------

  onCreateInviteLink(d: TeamDetail): void {
    if (this.teamFull(d)) return;
    this.busy.set(true);
    this.inviteError.set(null);
    this.teamService.createInviteLink(d.id, this.newInviteTtl()).subscribe({
      next: () => {
        this.busy.set(false);
        this.loadDetail(d.id);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.inviteError.set(this.describeHttpError(err));
      },
    });
  }

  async onRevokeLink(d: TeamDetail, link: TeamInviteLink): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Revoke invite link?',
      message: 'Anyone holding this URL will no longer be able to join. Already-accepted invitations are unaffected.',
      confirmLabel: 'Revoke',
      variant: 'destructive',
    });
    if (!ok) return;

    this.busy.set(true);
    this.teamService.revokeInviteLink(d.id, link.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.loadDetail(d.id);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.inviteError.set(this.describeHttpError(err));
      },
    });
  }

  async onDeleteLink(d: TeamDetail, link: TeamInviteLink): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete invite link?',
      message: 'The link record will be erased from the team history.',
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;

    this.busy.set(true);
    this.teamService.deleteInviteLink(d.id, link.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.loadDetail(d.id);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.inviteError.set(this.describeHttpError(err));
      },
    });
  }

  async copyInviteLink(token: string): Promise<void> {
    const url = this.buildInviteUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      this.copiedToken.set(token);
      setTimeout(() => {
        if (this.copiedToken() === token) this.copiedToken.set(null);
      }, 1500);
    } catch {
      // Ignore — the URL is still visible for manual copy.
    }
  }

  buildInviteUrl(token: string): string {
    if (typeof window === 'undefined') return `/invite/${token}`;
    return `${window.location.origin}/invite/${token}`;
  }

  // --- Unshare shared resources (lead action) -----------------------------

  async onUnshareConcept(d: TeamDetail, c: TeamSharedResource): Promise<void> {
    const ok = await this.confirm.confirm({
      title: `Unshare "${this.resourceTitle(c)}"?`,
      message: 'The concept will revert to private ownership. The original author keeps it — only team access is removed.',
      confirmLabel: 'Unshare',
      variant: 'destructive',
    });
    if (!ok) return;

    this.busy.set(true);
    this.resourcesError.set(null);
    this.conceptService.unshareFromTeam(c.id, d.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.loadResources(d.id);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.resourcesError.set(this.describeHttpError(err));
      },
    });
  }

  async onUnsharePayload(d: TeamDetail, p: TeamSharedResource): Promise<void> {
    const ok = await this.confirm.confirm({
      title: `Unshare "${this.resourceTitle(p)}"?`,
      message: 'The payload will revert to private ownership. The original author keeps it — only team access is removed.',
      confirmLabel: 'Unshare',
      variant: 'destructive',
    });
    if (!ok) return;

    this.busy.set(true);
    this.resourcesError.set(null);
    this.payloadService.unshareFromTeam(p.id, d.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.loadResources(d.id);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.resourcesError.set(this.describeHttpError(err));
      },
    });
  }

  // --- Derived / helpers ---------------------------------------------------

  isLead(d: TeamDetail): boolean {
    return d.role === 'lead';
  }

  teamFull(d: TeamDetail): boolean {
    return d.members.length >= MAX_MEMBERS;
  }

  isLinkActive(link: TeamInviteLink): boolean {
    return link.status === 'active';
  }

  linkState(link: TeamInviteLink): string {
    return link.status.toUpperCase();
  }

  initial(name: string): string {
    return (name || '?').trim().charAt(0).toUpperCase() || '?';
  }

  formatDate(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
    } catch {
      return iso;
    }
  }

  formatRelative(iso: string | null): string {
    if (!iso) return 'never expires';
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return 'expired';
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `in ${mins} min`;
    const hours = Math.round(mins / 60);
    if (hours < 48) return `in ${hours}h`;
    const days = Math.round(hours / 24);
    return `in ${days} day${days > 1 ? 's' : ''}`;
  }

  // --- Resources helpers — tolerant of shape since `any[]` ----------------

  resourceKey(r: TeamSharedResource): string {
    return r.id;
  }
  resourceTitle(r: TeamSharedResource): string {
    return r.title || 'Untitled';
  }
  resourceOwner(r: TeamSharedResource): string {
    return r.owner?.displayName ?? r.owner?.email ?? r.owner?.username ?? 'unknown';
  }
  resourceTags(r: TeamSharedResource): Array<{ name: string; isOfficial: boolean }> {
    const tags = r.tags;
    if (!Array.isArray(tags)) return [];
    return tags
      .map(t => {
        if (typeof t === 'string') return { name: t, isOfficial: false };
        return { name: t?.name ?? '', isOfficial: !!t?.isOfficial };
      })
      .filter(t => t.name);
  }

  private describeHttpError(err: HttpErrorResponse): string {
    if (err.status === 0) return 'Network error — is the API reachable?';
    if (err.error && typeof err.error === 'object' && 'error' in err.error) {
      return String((err.error as { error: unknown }).error);
    }
    if (err.error && typeof err.error === 'object' && 'message' in err.error) {
      return String((err.error as { message: unknown }).message);
    }
    return `HTTP ${err.status} — ${err.statusText || 'request failed'}`;
  }
}
