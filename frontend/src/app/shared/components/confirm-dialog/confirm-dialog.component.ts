import { Component, signal, computed, inject, Injectable, PLATFORM_ID, HostListener } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  AlertTriangle,
  X,
  Trash2,
} from 'lucide-angular';

const icons = { AlertTriangle, X, Trash2 };

/**
 * Terminal Atelier — Caution Modal.
 *
 * Reusable confirm dialog driven by {@link ConfirmDialogService}. The visual
 * language matches the rest of the app (card + border + radius tokens) with a
 * destructive accent: red left rail, red-tinted alert icon chip, uppercase
 * mono `[CAUTION]` eyebrow and a primary red action button. The "ghost" variant
 * is reserved for future non-destructive confirmations.
 */

export type ConfirmVariant = 'destructive' | 'default';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  /** Short uppercase eyebrow label above title — defaults to [CAUTION] / [CONFIRM]. */
  eyebrow?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  readonly request = signal<ConfirmRequest | null>(null);
  private resolver: ((ok: boolean) => void) | null = null;

  confirm(req: ConfirmRequest): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      // If a dialog is already open, resolve it as cancelled first
      if (this.resolver) this.resolver(false);
      this.resolver = resolve;
      this.request.set(req);
    });
  }

  resolve(ok: boolean): void {
    const r = this.resolver;
    this.resolver = null;
    this.request.set(null);
    r?.(ok);
  }
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [LucideAngularModule],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    @if (request(); as r) {
      <div class="cdlg-backdrop" (click)="cancel()" role="presentation">
        <div
          class="cdlg-panel"
          [class.destructive]="(r.variant ?? 'destructive') === 'destructive'"
          (click)="$event.stopPropagation()"
          role="alertdialog"
          aria-modal="true"
          [attr.aria-labelledby]="titleId"
          [attr.aria-describedby]="descId"
        >
          <div class="cdlg-rail" aria-hidden="true"></div>

          <div class="cdlg-content">
            <div class="cdlg-icon-chip" aria-hidden="true">
              <lucide-icon
                [name]="(r.variant ?? 'destructive') === 'destructive' ? 'alert-triangle' : 'trash-2'"
                [size]="18"
                [strokeWidth]="2"
              ></lucide-icon>
            </div>

            <div class="cdlg-text">
              <div class="cdlg-eyebrow font-mono">
                {{ r.eyebrow ?? ((r.variant ?? 'destructive') === 'destructive' ? '[CAUTION]' : '[CONFIRM]') }}
              </div>
              <h2 [id]="titleId" class="cdlg-title">{{ r.title }}</h2>
              <p [id]="descId" class="cdlg-message">{{ r.message }}</p>
            </div>

            <button
              type="button"
              class="cdlg-close"
              aria-label="Close"
              (click)="cancel()"
            >
              <lucide-icon name="x" [size]="16" [strokeWidth]="2"></lucide-icon>
            </button>
          </div>

          <div class="cdlg-footer">
            <button type="button" class="cdlg-btn cdlg-btn-ghost" (click)="cancel()">
              {{ r.cancelLabel ?? 'Cancel' }}
            </button>
            <button
              #confirmBtn
              type="button"
              class="cdlg-btn cdlg-btn-confirm"
              [class.destructive]="(r.variant ?? 'destructive') === 'destructive'"
              (click)="ok()"
              autofocus
            >
              {{ r.confirmLabel ?? 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { position: fixed; inset: 0; z-index: 300; pointer-events: none; }
    :host:has(.cdlg-backdrop) { pointer-events: auto; }

    .cdlg-backdrop {
      position: fixed; inset: 0;
      background: color-mix(in srgb, #000 55%, transparent);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      padding: 1.5rem;
      animation: cdlg-fade 120ms ease-out;
    }

    .cdlg-panel {
      position: relative;
      width: 100%; max-width: 26rem;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: calc(var(--radius));
      box-shadow:
        0 25px 50px -12px rgba(0, 0, 0, .45),
        0 0 0 1px color-mix(in srgb, var(--border) 40%, transparent);
      overflow: hidden;
      animation: cdlg-rise 160ms cubic-bezier(.2,.8,.2,1);
    }

    /* 3px colored rail on the left — the Terminal Atelier signature */
    .cdlg-rail {
      position: absolute; top: 0; bottom: 0; left: 0;
      width: 3px;
      background: var(--primary);
    }
    .cdlg-panel.destructive .cdlg-rail { background: var(--destructive); }

    .cdlg-content {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: .875rem;
      padding: 1.25rem 1.25rem .75rem 1.5rem;
      align-items: flex-start;
    }

    .cdlg-icon-chip {
      display: inline-flex; align-items: center; justify-content: center;
      width: 2rem; height: 2rem;
      border-radius: calc(var(--radius) - 3px);
      background: color-mix(in srgb, var(--primary) 10%, transparent);
      color: var(--primary);
      flex-shrink: 0;
    }
    .cdlg-panel.destructive .cdlg-icon-chip {
      background: color-mix(in srgb, var(--destructive) 12%, transparent);
      color: var(--destructive);
    }

    .cdlg-text { min-width: 0; }
    .cdlg-eyebrow {
      font-size: .6875rem;
      letter-spacing: .12em;
      font-weight: 600;
      color: var(--primary);
      margin-bottom: .35rem;
      text-transform: uppercase;
    }
    .cdlg-panel.destructive .cdlg-eyebrow { color: var(--destructive); }

    .cdlg-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--foreground);
      margin: 0 0 .4rem;
      line-height: 1.3;
      /* slight tracking to feel architectural, not generic */
      letter-spacing: -.005em;
    }
    .cdlg-message {
      font-size: .875rem;
      color: var(--muted-foreground);
      margin: 0;
      line-height: 1.55;
      overflow-wrap: anywhere;
    }

    .cdlg-close {
      display: inline-flex; align-items: center; justify-content: center;
      width: 1.75rem; height: 1.75rem;
      border-radius: calc(var(--radius) - 3px);
      border: none; background: transparent;
      color: var(--muted-foreground);
      cursor: pointer;
      transition: background-color .12s ease, color .12s ease;
    }
    .cdlg-close:hover { background: var(--secondary); color: var(--foreground); }

    .cdlg-footer {
      display: flex; justify-content: flex-end; gap: .5rem;
      padding: .75rem 1.25rem 1.25rem;
    }

    .cdlg-btn {
      display: inline-flex; align-items: center; justify-content: center;
      gap: .375rem;
      height: 2.25rem;
      padding: 0 .875rem;
      font-size: .8125rem;
      font-weight: 500;
      border-radius: calc(var(--radius) - 2px);
      border: 1px solid transparent;
      cursor: pointer;
      transition: background-color .12s ease, border-color .12s ease, color .12s ease, transform .12s ease;
    }
    .cdlg-btn:active { transform: translateY(1px); }

    .cdlg-btn-ghost {
      background: transparent;
      color: var(--foreground);
      border-color: var(--border);
    }
    .cdlg-btn-ghost:hover { background: var(--secondary); }

    .cdlg-btn-confirm {
      background: var(--primary);
      color: var(--primary-foreground);
    }
    .cdlg-btn-confirm:hover {
      background: color-mix(in srgb, var(--primary) 88%, #000);
    }
    .cdlg-btn-confirm.destructive {
      background: var(--destructive);
      color: var(--destructive-foreground, #fff);
    }
    .cdlg-btn-confirm.destructive:hover {
      background: color-mix(in srgb, var(--destructive) 88%, #000);
    }
    .cdlg-btn:focus-visible {
      outline: none;
      box-shadow:
        0 0 0 2px var(--card),
        0 0 0 4px color-mix(in srgb, var(--primary) 55%, transparent);
    }
    .cdlg-btn-confirm.destructive:focus-visible {
      box-shadow:
        0 0 0 2px var(--card),
        0 0 0 4px color-mix(in srgb, var(--destructive) 55%, transparent);
    }

    @keyframes cdlg-fade {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes cdlg-rise {
      from { opacity: 0; transform: translateY(6px) scale(.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      .cdlg-backdrop, .cdlg-panel { animation: none; }
    }
    @media (max-width: 480px) {
      .cdlg-content { grid-template-columns: auto 1fr; }
      .cdlg-close { position: absolute; top: .5rem; right: .5rem; }
    }
  `],
})
export class ConfirmDialogComponent {
  private readonly service = inject(ConfirmDialogService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly request = computed(() => this.service.request());
  readonly titleId = `cdlg-title-${Math.random().toString(36).slice(2, 8)}`;
  readonly descId = `cdlg-desc-${Math.random().toString(36).slice(2, 8)}`;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (isPlatformBrowser(this.platformId) && this.request()) this.cancel();
  }

  @HostListener('document:keydown.enter')
  onEnter(): void {
    if (isPlatformBrowser(this.platformId) && this.request()) this.ok();
  }

  ok(): void { this.service.resolve(true); }
  cancel(): void { this.service.resolve(false); }
}
