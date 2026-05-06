import {
  Component,
  HostListener,
  PLATFORM_ID,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import {
  LUCIDE_ICONS,
  LucideAngularModule,
  LucideIconProvider,
  AlertTriangle,
  CheckCircle,
  Flag,
  X,
} from 'lucide-angular';
import { ReportService } from '../../../core/services/report.service';
import {
  ReportReason,
  ReportTargetType,
} from '../../../core/models/report.model';

const icons = { AlertTriangle, CheckCircle, Flag, X };

const MAX_DETAILS_LENGTH = 2000;

interface ReasonOption {
  value: ReportReason;
  label: string;
}

/**
 * Modal dialog letting any visitor (including guests) report a public
 * resource. Posts to /api/reports — once 201 comes back, we flip to a
 * success state for ~2s before closing automatically. The host page is
 * expected to render the host with `*ngIf` / `@if` and listen on `closed`.
 *
 * Usage:
 *   <app-report-dialog
 *     [targetType]="'concept'"
 *     [targetId]="concept.id"
 *     (closed)="showReport.set(false)"
 *   />
 */
@Component({
  selector: 'app-report-dialog',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <div class="rdlg-backdrop" (click)="onBackdrop()" role="presentation">
      <div
        class="rdlg-panel"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId"
      >
        <div class="rdlg-rail" aria-hidden="true"></div>

        <header class="rdlg-header">
          <div class="rdlg-icon-chip">
            <lucide-icon name="flag" [size]="16" [strokeWidth]="2"></lucide-icon>
          </div>
          <div class="rdlg-titles">
            <div class="rdlg-eyebrow font-mono">[SIGNALEMENT]</div>
            <h2 [id]="titleId" class="rdlg-title">Signaler ce contenu</h2>
          </div>
          <button
            type="button"
            class="rdlg-close"
            aria-label="Fermer"
            (click)="cancel()"
          >
            <lucide-icon name="x" [size]="16" [strokeWidth]="2"></lucide-icon>
          </button>
        </header>

        @if (success()) {
          <div class="rdlg-body rdlg-success">
            <div class="rdlg-success-icon">
              <lucide-icon name="check-circle" [size]="36" [strokeWidth]="1.75"></lucide-icon>
            </div>
            <p class="rdlg-success-title">Signalement envoyé</p>
            <p class="rdlg-success-message">Traité sous 24h ouvré.</p>
          </div>
        } @else {
          <div class="rdlg-body">
            <p class="rdlg-intro">
              Aidez-nous à modérer les contenus publics. Les signalements abusifs
              peuvent entraîner la suspension du compte.
            </p>

            <div class="rdlg-field">
              <label class="rdlg-label font-mono" for="rdlg-reason">MOTIF</label>
              <select
                id="rdlg-reason"
                class="rdlg-select"
                [(ngModel)]="reason"
                [disabled]="submitting()"
              >
                @for (option of reasonOptions; track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            </div>

            <div class="rdlg-field">
              <label class="rdlg-label font-mono" for="rdlg-details">
                DÉTAILS (OPTIONNEL)
              </label>
              <textarea
                id="rdlg-details"
                class="rdlg-textarea font-mono"
                rows="4"
                [maxlength]="maxDetailsLength"
                placeholder="Décrivez brièvement le problème (URL externe, capture, contexte…)."
                [(ngModel)]="details"
                [disabled]="submitting()"
              ></textarea>
              <div class="rdlg-counter font-mono" [class.over]="detailsLength() > maxDetailsLength">
                {{ detailsLength() }} / {{ maxDetailsLength }}
              </div>
            </div>

            @if (errorMessage()) {
              <div class="rdlg-error">
                <lucide-icon name="alert-triangle" [size]="14" [strokeWidth]="2"></lucide-icon>
                {{ errorMessage() }}
              </div>
            }
          </div>

          <footer class="rdlg-footer">
            <button
              type="button"
              class="rdlg-btn rdlg-btn-ghost"
              (click)="cancel()"
              [disabled]="submitting()"
            >
              Annuler
            </button>
            <button
              type="button"
              class="rdlg-btn rdlg-btn-confirm"
              (click)="submit()"
              [disabled]="submitting() || !reason"
            >
              @if (submitting()) {
                Envoi…
              } @else {
                <lucide-icon name="flag" [size]="14" [strokeWidth]="2"></lucide-icon>
                Signaler
              }
            </button>
          </footer>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      position: fixed;
      inset: 0;
      z-index: 320;
      display: block;
    }

    .rdlg-backdrop {
      position: fixed; inset: 0;
      background: color-mix(in srgb, #000 55%, transparent);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      padding: 1.5rem;
      animation: rdlg-fade 120ms ease-out;
    }

    .rdlg-panel {
      position: relative;
      width: 100%; max-width: 30rem;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow:
        0 25px 50px -12px rgba(0, 0, 0, .45),
        0 0 0 1px color-mix(in srgb, var(--border) 40%, transparent);
      overflow: hidden;
      animation: rdlg-rise 160ms cubic-bezier(.2,.8,.2,1);
      display: flex;
      flex-direction: column;
    }

    .rdlg-rail {
      position: absolute; top: 0; bottom: 0; left: 0;
      width: 3px;
      background: var(--destructive);
    }

    .rdlg-header {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1rem 0.75rem 1.25rem;
      border-bottom: 1px solid var(--border);
    }
    .rdlg-icon-chip {
      display: inline-flex; align-items: center; justify-content: center;
      width: 2rem; height: 2rem;
      border-radius: calc(var(--radius) - 3px);
      background: color-mix(in srgb, var(--destructive) 12%, transparent);
      color: var(--destructive);
    }
    .rdlg-titles { display: flex; flex-direction: column; gap: 0.125rem; min-width: 0; }
    .rdlg-eyebrow {
      font-size: 0.6875rem;
      letter-spacing: 0.12em;
      font-weight: 600;
      color: var(--destructive);
      text-transform: uppercase;
    }
    .rdlg-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--foreground);
      line-height: 1.3;
    }
    .rdlg-close {
      display: inline-flex; align-items: center; justify-content: center;
      width: 1.75rem; height: 1.75rem;
      border-radius: calc(var(--radius) - 3px);
      border: none;
      background: transparent;
      color: var(--muted-foreground);
      cursor: pointer;
      transition: background-color .12s, color .12s;
    }
    .rdlg-close:hover { background: var(--secondary); color: var(--foreground); }

    .rdlg-body {
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }
    .rdlg-intro {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--muted-foreground);
      line-height: 1.5;
    }

    .rdlg-field { display: flex; flex-direction: column; gap: 0.375rem; }
    .rdlg-label {
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      color: var(--muted-foreground);
    }
    .rdlg-select,
    .rdlg-textarea {
      width: 100%;
      padding: 0.5rem 0.625rem;
      background: var(--input-background);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--foreground);
      font-family: inherit;
      font-size: 0.875rem;
      outline: none;
      transition: border-color .12s, box-shadow .12s;
    }
    .rdlg-select { height: 2.375rem; }
    .rdlg-textarea {
      resize: vertical;
      min-height: 5rem;
      line-height: 1.5;
    }
    .rdlg-select:focus,
    .rdlg-textarea:focus {
      border-color: var(--destructive);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--destructive) 25%, transparent);
    }
    .rdlg-select:disabled,
    .rdlg-textarea:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .rdlg-counter {
      align-self: flex-end;
      font-size: 0.6875rem;
      color: var(--muted-foreground);
    }
    .rdlg-counter.over { color: var(--destructive); }

    .rdlg-error {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: color-mix(in srgb, var(--destructive) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--destructive) 30%, transparent);
      color: var(--destructive);
      border-radius: var(--radius);
      font-size: 0.8125rem;
    }

    .rdlg-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem 1.125rem;
      border-top: 1px solid var(--border);
    }
    .rdlg-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      height: 2.25rem;
      padding: 0 0.875rem;
      font-size: 0.8125rem;
      font-weight: 500;
      border-radius: calc(var(--radius) - 2px);
      border: 1px solid transparent;
      cursor: pointer;
      transition: background-color .12s, border-color .12s, color .12s, transform .12s;
    }
    .rdlg-btn:active { transform: translateY(1px); }
    .rdlg-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      transform: none;
    }
    .rdlg-btn-ghost {
      background: transparent;
      color: var(--foreground);
      border-color: var(--border);
    }
    .rdlg-btn-ghost:hover:not(:disabled) { background: var(--secondary); }
    .rdlg-btn-confirm {
      background: var(--destructive);
      color: var(--destructive-foreground, #fff);
    }
    .rdlg-btn-confirm:hover:not(:disabled) {
      background: color-mix(in srgb, var(--destructive) 88%, #000);
    }

    .rdlg-success {
      align-items: center;
      text-align: center;
      padding: 2rem 1.5rem 2.25rem;
      gap: 0.5rem;
    }
    .rdlg-success-icon {
      color: var(--primary);
      margin-bottom: 0.5rem;
    }
    .rdlg-success-title {
      margin: 0;
      font-weight: 600;
      font-size: 1rem;
      color: var(--foreground);
    }
    .rdlg-success-message {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--muted-foreground);
    }

    @keyframes rdlg-fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes rdlg-rise {
      from { opacity: 0; transform: translateY(6px) scale(.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      .rdlg-backdrop, .rdlg-panel { animation: none; }
    }
    @media (max-width: 480px) {
      .rdlg-backdrop { padding: 0.75rem; }
      .rdlg-panel { max-width: 100%; }
      .rdlg-header { padding: 0.875rem 0.875rem 0.625rem 1rem; }
      .rdlg-body { padding: 0.875rem 1rem; }
      .rdlg-footer { padding: 0.625rem 1rem 0.875rem; }
    }
  `],
})
export class ReportDialogComponent {
  readonly targetType = input.required<ReportTargetType>();
  readonly targetId = input.required<string>();

  readonly closed = output<void>();

  private readonly reportService = inject(ReportService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly maxDetailsLength = MAX_DETAILS_LENGTH;
  readonly titleId = `rdlg-title-${Math.random().toString(36).slice(2, 8)}`;

  // The dropdown is ordered by perceived severity: outright illegal stuff
  // first, lower-stakes options after.
  readonly reasonOptions: ReasonOption[] = [
    { value: 'illegal_content', label: 'Contenu illégal' },
    { value: 'malware_distribution', label: 'Malware ciblé' },
    { value: 'phishing', label: 'Phishing actif' },
    { value: 'csam', label: 'Contenu pédopornographique' },
    { value: 'terrorism', label: 'Apologie du terrorisme' },
    { value: 'copyright', label: "Atteinte au droit d'auteur" },
    { value: 'spam', label: 'Spam' },
    { value: 'other', label: 'Autre' },
  ];

  reason: ReportReason = 'illegal_content';
  details = '';
  readonly submitting = signal(false);
  readonly success = signal(false);
  readonly errorMessage = signal('');

  readonly detailsLength = computed(() => this.details?.length ?? 0);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.submitting()) this.cancel();
  }

  cancel(): void {
    this.closed.emit();
  }

  onBackdrop(): void {
    if (this.submitting()) return;
    this.cancel();
  }

  submit(): void {
    if (this.submitting()) return;
    if (this.detailsLength() > this.maxDetailsLength) {
      this.errorMessage.set('Détails trop longs (2000 caractères max).');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.reportService
      .submitReport(this.targetType(), this.targetId(), this.reason, this.details)
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.success.set(true);
          // Auto-close so the user does not need to dismiss the success modal.
          setTimeout(() => this.closed.emit(), 1800);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          if (err.status === 429) {
            this.errorMessage.set(
              'Trop de signalements envoyés récemment. Réessayez plus tard.',
            );
          } else if (err.status === 401) {
            this.errorMessage.set(
              'Vous devez être connecté pour signaler ce contenu.',
            );
          } else if (err.status === 404) {
            this.errorMessage.set("Ce contenu n'existe plus.");
          } else {
            const detail = err?.error?.error ?? err?.error?.message ?? err?.message ?? '';
            this.errorMessage.set(
              detail
                ? `Échec de l'envoi : ${detail}`
                : "Échec de l'envoi du signalement. Réessayez.",
            );
          }
        },
      });
  }
}
