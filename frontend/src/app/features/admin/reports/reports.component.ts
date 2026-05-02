import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  LUCIDE_ICONS,
  LucideAngularModule,
  LucideIconProvider,
  AlertTriangle,
  Ban,
  EyeOff,
  Flag,
  Shield,
  Trash2,
  X,
} from 'lucide-angular';
import { ReportService } from '../../../core/services/report.service';
import {
  AdminReport,
  ReportReason,
  ReportResolveAction,
  ReportStatus,
  ReportTargetType,
} from '../../../core/models/report.model';

const icons = { AlertTriangle, Ban, EyeOff, Flag, Shield, Trash2, X };

const REASON_LABELS: Record<ReportReason, string> = {
  illegal: 'Contenu illégal',
  malware: 'Malware ciblé',
  phishing: 'Phishing actif',
  csam: 'Pédopornographie',
  terrorism: 'Apologie terrorisme',
  copyright: "Droit d'auteur",
  spam: 'Spam',
  other: 'Autre',
};

const TARGET_LABELS: Record<ReportTargetType, string> = {
  concept: 'Concept',
  snippet: 'Snippet',
  payload: 'Payload',
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'En attente',
  dismissed: 'Rejeté',
  hidden: 'Masqué',
  removed: 'Supprimé',
  banned: 'Bannissement',
};

interface ResolutionDraft {
  action: ReportResolveAction;
  notes: string;
}

/**
 * Admin moderation queue. Lists reports filtered by status (pending by
 * default) and lets the moderator resolve each one with one of:
 *   - dismiss: nothing happens, the report is closed.
 *   - hide:    backend flips the resource to private (owner keeps it).
 *   - remove:  backend hard-deletes the resource.
 *   - ban_user: backend disables the reporter's target user account.
 *
 * Notes are optional but encouraged. After every resolution the list is
 * refetched to drop the closed report from view.
 */
@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <div class="reports-page">
      <header class="page-header">
        <div class="page-header-icon">
          <lucide-icon name="flag" [size]="22" [strokeWidth]="2"></lucide-icon>
        </div>
        <div class="page-header-text">
          <h1 class="page-title">REPORTS</h1>
          <p class="page-subtitle">Modération des signalements utilisateurs</p>
        </div>
        <a routerLink="/admin" class="back-link font-mono">← Admin</a>
      </header>

      <nav class="status-tabs">
        @for (s of statusTabs; track s) {
          <button
            type="button"
            class="status-tab"
            [class.active]="status() === s"
            (click)="setStatus(s)"
          >
            {{ statusLabel(s) }}
          </button>
        }
      </nav>

      @if (errorMessage()) {
        <div class="notice notice-error">
          <lucide-icon name="alert-triangle" [size]="14" [strokeWidth]="2"></lucide-icon>
          {{ errorMessage() }}
        </div>
      }

      @if (loading() && reports().length === 0) {
        <p class="muted">Chargement…</p>
      } @else if (reports().length === 0) {
        <div class="empty">
          <lucide-icon name="shield" [size]="36" [strokeWidth]="1.5"></lucide-icon>
          <p>Aucun signalement {{ statusLabel(status()).toLowerCase() }}.</p>
        </div>
      } @else {
        <div class="report-list">
          @for (r of reports(); track r.id) {
            <article class="report-card">
              <div class="report-head">
                <div class="report-meta">
                  <span class="chip chip-target font-mono">{{ targetLabel(r.target_type) }}</span>
                  <span class="chip chip-reason font-mono">{{ reasonLabel(r.reason) }}</span>
                  <span class="chip font-mono">{{ formatDate(r.created_at) }}</span>
                </div>
                <button
                  type="button"
                  class="report-id font-mono"
                  [title]="'Report ID: ' + r.id"
                >
                  #{{ r.id.slice(0, 8) }}
                </button>
              </div>

              <div class="report-content">
                <div class="report-title-row">
                  @if (r.target_preview?.title) {
                    <h2 class="report-title">{{ r.target_preview!.title }}</h2>
                  } @else {
                    <h2 class="report-title muted-title">Contenu supprimé ou indisponible</h2>
                  }
                </div>
                @if (r.target_preview?.description) {
                  <p class="report-description">{{ r.target_preview!.description }}</p>
                }
                @if (r.details) {
                  <div class="report-details">
                    <span class="report-details-label font-mono">DÉTAILS DU SIGNALEUR</span>
                    <p class="report-details-text">{{ r.details }}</p>
                  </div>
                }
                <div class="report-reporter">
                  @if (r.reporter) {
                    <span class="muted font-mono">
                      Signalé par <strong>&#64;{{ r.reporter.username }}</strong>
                    </span>
                  } @else {
                    <span class="muted font-mono">Signalement anonyme (guest)</span>
                  }
                </div>
              </div>

              @if (r.status === 'pending') {
                <div class="report-actions-card">
                  <label class="action-label font-mono" [for]="'notes-' + r.id">
                    NOTES (OPTIONNEL)
                  </label>
                  <textarea
                    [id]="'notes-' + r.id"
                    class="action-notes font-mono"
                    rows="2"
                    placeholder="Pourquoi cette décision ? (visible uniquement par les autres admins)"
                    [ngModel]="draft(r.id).notes"
                    (ngModelChange)="updateNotes(r.id, $event)"
                    [disabled]="busyId() === r.id"
                  ></textarea>

                  <div class="action-buttons">
                    <button
                      type="button"
                      class="btn btn-ghost"
                      (click)="resolve(r, 'dismiss')"
                      [disabled]="busyId() === r.id"
                      title="Rejeter le signalement, rien ne change"
                    >
                      <lucide-icon name="x" [size]="14" [strokeWidth]="2"></lucide-icon>
                      Rejeter
                    </button>
                    <button
                      type="button"
                      class="btn btn-warn"
                      (click)="resolve(r, 'hide')"
                      [disabled]="busyId() === r.id"
                      title="Bascule la ressource en privé"
                    >
                      <lucide-icon name="eye-off" [size]="14" [strokeWidth]="2"></lucide-icon>
                      Masquer
                    </button>
                    <button
                      type="button"
                      class="btn btn-danger"
                      (click)="resolve(r, 'remove')"
                      [disabled]="busyId() === r.id"
                      title="Suppression définitive de la ressource"
                    >
                      <lucide-icon name="trash-2" [size]="14" [strokeWidth]="2"></lucide-icon>
                      Supprimer
                    </button>
                    <button
                      type="button"
                      class="btn btn-danger-strong"
                      (click)="resolve(r, 'ban_user')"
                      [disabled]="busyId() === r.id || !r.reporter"
                      [title]="r.reporter ? 'Bannir le compte signalé' : 'Pas d\\'utilisateur à bannir (signalement anonyme)'"
                    >
                      <lucide-icon name="ban" [size]="14" [strokeWidth]="2"></lucide-icon>
                      Bannir
                    </button>
                  </div>
                </div>
              } @else {
                <div class="status-banner font-mono">
                  Statut : {{ statusLabel(r.status) }}
                </div>
              }
            </article>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .reports-page {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 0.5rem 0 3rem;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.25rem;
    }
    .page-header-icon {
      display: flex; align-items: center; justify-content: center;
      width: 2.5rem; height: 2.5rem;
      background: color-mix(in srgb, var(--destructive) 12%, transparent);
      color: var(--destructive);
      border-radius: var(--radius);
    }
    .page-header-text { flex: 1; min-width: 0; }
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
    .back-link {
      font-size: 0.75rem;
      color: var(--muted-foreground);
      text-decoration: none;
      padding: 0.375rem 0.625rem;
      border-radius: var(--radius);
      transition: background-color 0.12s, color 0.12s;
    }
    .back-link:hover { color: var(--foreground); background: var(--secondary); }

    .status-tabs {
      display: flex;
      gap: 0.25rem;
      border-bottom: 1px solid var(--border);
      flex-wrap: wrap;
    }
    .status-tab {
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
    .status-tab:hover { color: var(--foreground); }
    .status-tab.active { color: var(--destructive); border-bottom-color: var(--destructive); }

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

    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.625rem;
      padding: 3rem 1rem;
      color: var(--muted-foreground);
      text-align: center;
    }
    .muted { color: var(--muted-foreground); font-size: 0.8125rem; }

    .report-list {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }

    .report-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1rem 1.125rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .report-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .report-meta { display: flex; gap: 0.375rem; flex-wrap: wrap; }
    .chip {
      display: inline-flex;
      align-items: center;
      font-size: 0.6875rem;
      padding: 0.1875rem 0.5rem;
      background: var(--secondary);
      color: var(--muted-foreground);
      border-radius: 999px;
      border: 1px solid var(--border);
    }
    .chip-target {
      background: color-mix(in srgb, var(--primary) 12%, transparent);
      color: var(--primary);
      border-color: color-mix(in srgb, var(--primary) 28%, transparent);
    }
    .chip-reason {
      background: color-mix(in srgb, var(--destructive) 12%, transparent);
      color: var(--destructive);
      border-color: color-mix(in srgb, var(--destructive) 28%, transparent);
    }
    .report-id {
      font-size: 0.6875rem;
      color: var(--muted-foreground);
      background: var(--secondary);
      padding: 0.1875rem 0.5rem;
      border-radius: var(--radius);
      border: none;
      cursor: default;
    }

    .report-content {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .report-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .report-title {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--foreground);
      line-height: 1.35;
    }
    .muted-title { color: var(--muted-foreground); font-style: italic; font-weight: 500; }
    .report-description {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--muted-foreground);
      line-height: 1.5;
    }
    .report-details {
      background: var(--secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.625rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .report-details-label {
      font-size: 0.625rem;
      letter-spacing: 0.08em;
      color: var(--muted-foreground);
    }
    .report-details-text {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--foreground);
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .report-reporter { font-size: 0.75rem; color: var(--muted-foreground); }
    .report-reporter strong { color: var(--foreground); font-weight: 500; }

    .report-actions-card {
      border-top: 1px solid var(--border);
      padding-top: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }
    .action-label {
      font-size: 0.6875rem;
      letter-spacing: 0.06em;
      font-weight: 600;
      color: var(--muted-foreground);
    }
    .action-notes {
      width: 100%;
      padding: 0.5rem 0.625rem;
      background: var(--input-background);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--foreground);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8125rem;
      resize: vertical;
      outline: none;
    }
    .action-notes:focus {
      border-color: var(--destructive);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--destructive) 20%, transparent);
    }
    .action-buttons {
      display: flex;
      gap: 0.375rem;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.75rem;
      border-radius: var(--radius);
      border: 1px solid transparent;
      font-family: inherit;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.12s, color 0.12s, border-color 0.12s, opacity 0.12s;
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-ghost {
      background: transparent;
      color: var(--foreground);
      border-color: var(--border);
    }
    .btn-ghost:hover:not(:disabled) { background: var(--secondary); }
    .btn-warn {
      background: transparent;
      color: var(--accent);
      border-color: color-mix(in srgb, var(--accent) 35%, transparent);
    }
    .btn-warn:hover:not(:disabled) {
      background: color-mix(in srgb, var(--accent) 12%, transparent);
    }
    .btn-danger {
      background: transparent;
      color: var(--destructive);
      border-color: color-mix(in srgb, var(--destructive) 40%, transparent);
    }
    .btn-danger:hover:not(:disabled) {
      background: color-mix(in srgb, var(--destructive) 12%, transparent);
    }
    .btn-danger-strong {
      background: var(--destructive);
      color: var(--destructive-foreground, #fff);
      border-color: var(--destructive);
    }
    .btn-danger-strong:hover:not(:disabled) {
      background: color-mix(in srgb, var(--destructive) 88%, #000);
    }

    .status-banner {
      padding: 0.5rem 0.75rem;
      border-top: 1px solid var(--border);
      font-size: 0.75rem;
      color: var(--muted-foreground);
      letter-spacing: 0.04em;
    }

    @media (max-width: 768px) {
      .reports-page { gap: 0.75rem; padding: 0.25rem 0 2rem; }
      .page-title { font-size: 1rem; }
      .report-card { padding: 0.875rem 0.875rem; }
      .action-buttons { justify-content: stretch; }
      .action-buttons .btn { flex: 1; justify-content: center; }
    }
  `],
})
export class AdminReportsComponent implements OnInit {
  private readonly reportService = inject(ReportService);

  readonly statusTabs: ReportStatus[] = ['pending', 'dismissed', 'hidden', 'removed', 'banned'];

  readonly status = signal<ReportStatus>('pending');
  readonly reports = signal<AdminReport[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly busyId = signal<string | null>(null);
  // Per-report textarea content. We keep a single signal of a record so the
  // change to one row's notes doesn't churn the others.
  private readonly drafts = signal<Record<string, ResolutionDraft>>({});

  readonly hasReports = computed(() => this.reports().length > 0);

  ngOnInit(): void {
    this.load();
  }

  setStatus(next: ReportStatus): void {
    if (this.status() === next) return;
    this.status.set(next);
    this.errorMessage.set('');
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.reportService.listAdmin(this.status()).subscribe({
      next: rows => {
        this.reports.set(rows ?? []);
        this.loading.set(false);
        this.drafts.set({});
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.showError('Échec du chargement des signalements', err);
      },
    });
  }

  draft(id: string): ResolutionDraft {
    return this.drafts()[id] ?? { action: 'dismiss', notes: '' };
  }

  updateNotes(id: string, notes: string): void {
    this.drafts.update(d => ({
      ...d,
      [id]: { ...this.draft(id), notes },
    }));
  }

  resolve(report: AdminReport, action: ReportResolveAction): void {
    if (this.busyId()) return;
    this.busyId.set(report.id);
    const notes = this.draft(report.id).notes.trim();
    this.reportService.resolve(report.id, { action, notes: notes || undefined }).subscribe({
      next: () => {
        this.busyId.set(null);
        // Drop the resolved report from the visible list immediately. A full
        // refetch on the next status switch will reflect any side-effect
        // (deletion / hide flag).
        this.reports.update(list => list.filter(r => r.id !== report.id));
        this.drafts.update(d => {
          const next = { ...d };
          delete next[report.id];
          return next;
        });
      },
      error: (err: HttpErrorResponse) => {
        this.busyId.set(null);
        this.showError('Échec de la résolution', err);
      },
    });
  }

  reasonLabel(reason: ReportReason): string {
    return REASON_LABELS[reason] ?? reason;
  }

  targetLabel(target: ReportTargetType): string {
    return TARGET_LABELS[target] ?? target;
  }

  statusLabel(status: ReportStatus): string {
    return STATUS_LABELS[status] ?? status;
  }

  formatDate(iso: string): string {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleString('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  }

  private showError(label: string, err?: HttpErrorResponse): void {
    const detail = err?.error?.message ?? err?.error?.error ?? err?.message ?? '';
    this.errorMessage.set(detail ? `${label} : ${detail}` : label);
    setTimeout(() => this.errorMessage.set(''), 5000);
  }
}
