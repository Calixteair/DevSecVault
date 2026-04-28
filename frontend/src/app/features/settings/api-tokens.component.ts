import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgClass } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  KeyRound,
  Plus,
  Copy,
  Trash2,
  ArrowLeft,
  Shield,
  AlertTriangle,
  Check,
  Crown,
  Clock,
  X,
} from 'lucide-angular';
import { ApiTokenService } from '../../core/services/api-token.service';
import {
  ApiToken,
  ApiTokenCreated,
  ApiTokenExpiryPreset,
} from '../../core/models/api-token.model';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { NotificationService } from '../../core/services/notification.service';

const icons = {
  KeyRound,
  Plus,
  Copy,
  Trash2,
  ArrowLeft,
  Shield,
  AlertTriangle,
  Check,
  Crown,
  Clock,
  X,
};

interface ExpiryOption {
  value: ApiTokenExpiryPreset;
  label: string;
  hint: string;
}

@Component({
  selector: 'app-api-tokens',
  imports: [FormsModule, DatePipe, NgClass, RouterLink, LucideAngularModule],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <div class="page">
      <a routerLink="/settings" class="back-link">
        <lucide-icon name="arrow-left" [size]="14" [strokeWidth]="2"></lucide-icon>
        Back to Settings
      </a>

      <div class="page-head">
        <div>
          <h1 class="page-title">Personal Access Tokens</h1>
          <p class="page-subtitle">
            Authenticate scripts and CLI clients without your browser. Each token grants the same
            access as your account, except <span class="font-mono">PUT</span>/<span class="font-mono">PATCH</span>
            (mutations are limited to <span class="font-mono">POST</span> and <span class="font-mono">DELETE</span>).
          </p>
        </div>
        @if (!showCreate() && !revealed()) {
          <button
            type="button"
            class="btn-primary"
            (click)="openCreate()"
            [disabled]="tokens().length >= MAX_TOKENS"
          >
            <lucide-icon name="plus" [size]="14" [strokeWidth]="2.2"></lucide-icon>
            New token
          </button>
        }
      </div>

      <!-- One-shot reveal panel -->
      @if (revealed(); as r) {
        <div class="reveal-card">
          <div class="reveal-header">
            <div class="reveal-icon">
              <lucide-icon name="check" [size]="18" [strokeWidth]="2.2"></lucide-icon>
            </div>
            <div>
              <div class="reveal-eyebrow font-mono">[TOKEN GENERATED]</div>
              <h2 class="reveal-title">Copy your token now</h2>
              <p class="reveal-message">
                This is the only time it will be displayed. If you lose it, revoke and create a new one.
              </p>
            </div>
          </div>

          <div class="reveal-token-row">
            <code class="reveal-token font-mono">{{ r.token }}</code>
            <button type="button" class="btn-ghost-icon" (click)="copyToken(r.token)" title="Copy">
              <lucide-icon name="copy" [size]="14" [strokeWidth]="2"></lucide-icon>
            </button>
          </div>

          <div class="reveal-meta font-mono">
            <span>{{ r.name }}</span>
            <span>·</span>
            <span>expires: {{ r.expiresAt ? (r.expiresAt | date:'mediumDate') : 'never' }}</span>
            @if (r.includeAdmin) {
              <span>·</span>
              <span class="badge-admin">
                <lucide-icon name="crown" [size]="11" [strokeWidth]="2.2"></lucide-icon>
                admin scope
              </span>
            }
          </div>

          <div class="reveal-actions">
            <button type="button" class="btn-primary" (click)="dismissReveal()">
              I've saved it
            </button>
          </div>
        </div>
      }

      <!-- Create form -->
      @if (showCreate()) {
        <div class="create-card">
          <div class="create-head">
            <h2 class="create-title">Create a new token</h2>
            <button type="button" class="btn-ghost-icon" (click)="cancelCreate()" title="Cancel">
              <lucide-icon name="x" [size]="14" [strokeWidth]="2"></lucide-icon>
            </button>
          </div>

          <div class="form-row">
            <label for="tk-name" class="form-label font-mono">NAME</label>
            <input
              id="tk-name"
              type="text"
              class="form-input font-mono"
              placeholder="e.g. laptop-cli"
              maxlength="100"
              [(ngModel)]="name"
              [disabled]="creating()"
            />
            <span class="form-hint">Used to recognize this token in the list — not shown to others.</span>
          </div>

          <div class="form-row">
            <span class="form-label font-mono">EXPIRES IN</span>
            <div class="preset-grid">
              @for (opt of expiryOptions; track opt.value) {
                <button
                  type="button"
                  class="preset-btn"
                  [class.active]="expiry() === opt.value"
                  [class.never]="opt.value === 'never' && expiry() === 'never'"
                  (click)="expiry.set(opt.value)"
                  [disabled]="creating()"
                >
                  <span class="preset-label font-mono">{{ opt.label }}</span>
                  <span class="preset-hint">{{ opt.hint }}</span>
                </button>
              }
            </div>
          </div>

          @if (isAdmin()) {
            <div class="form-row admin-row">
              <label class="checkbox-row">
                <input
                  type="checkbox"
                  [checked]="includeAdmin()"
                  (change)="toggleIncludeAdmin($event)"
                  [disabled]="creating()"
                />
                <span class="checkbox-text">
                  <span class="checkbox-title font-mono">INCLUDE ADMIN SCOPE</span>
                  <span class="checkbox-hint">
                    Allow this token to access <span class="font-mono">/api/admin/*</span> endpoints.
                    Leave unchecked unless you really need it.
                  </span>
                </span>
              </label>
            </div>
          }

          @if (createError()) {
            <div class="form-error font-mono">{{ createError() }}</div>
          }

          <div class="form-actions">
            <button type="button" class="btn-ghost" (click)="cancelCreate()" [disabled]="creating()">
              Cancel
            </button>
            <button
              type="button"
              class="btn-primary"
              (click)="submitCreate()"
              [disabled]="creating() || !name().trim()"
            >
              {{ creating() ? 'Generating...' : 'Generate token' }}
            </button>
          </div>
        </div>
      }

      <!-- List -->
      <div class="tokens-section">
        <div class="section-header">
          <span class="section-title font-mono">ACTIVE TOKENS · {{ tokens().length }} / {{ MAX_TOKENS }}</span>
        </div>

        @if (loading()) {
          <div class="empty">Loading…</div>
        } @else if (tokens().length === 0) {
          <div class="empty">
            <lucide-icon name="key-round" [size]="22" [strokeWidth]="1.5"></lucide-icon>
            <p>No tokens yet. Create one to authenticate scripts or CLIs.</p>
          </div>
        } @else {
          <div class="token-list">
            @for (t of tokens(); track t.id) {
              <div class="token-row" [ngClass]="{ expired: t.expired }">
                <div class="token-icon">
                  <lucide-icon name="key-round" [size]="16" [strokeWidth]="2"></lucide-icon>
                </div>
                <div class="token-main">
                  <div class="token-line1">
                    <span class="token-name">{{ t.name }}</span>
                    <span class="token-prefix font-mono">{{ t.prefix }}…</span>
                    @if (t.includeAdmin) {
                      <span class="badge-admin">
                        <lucide-icon name="crown" [size]="11" [strokeWidth]="2.2"></lucide-icon>
                        admin
                      </span>
                    }
                    @if (t.expired) {
                      <span class="badge-expired">
                        <lucide-icon name="alert-triangle" [size]="11" [strokeWidth]="2.2"></lucide-icon>
                        expired
                      </span>
                    }
                  </div>
                  <div class="token-line2 font-mono">
                    <span class="meta">
                      created {{ t.createdAt | date:'mediumDate' }}
                    </span>
                    <span class="meta">
                      <lucide-icon name="clock" [size]="11" [strokeWidth]="2"></lucide-icon>
                      {{ t.expiresAt ? ('expires ' + (t.expiresAt | date:'mediumDate')) : 'no expiry' }}
                    </span>
                    <span class="meta">
                      last used: {{ t.lastUsedAt ? (t.lastUsedAt | date:'medium') : 'never' }}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  class="btn-danger-icon"
                  (click)="revoke(t)"
                  [disabled]="revokingId() === t.id"
                  title="Revoke"
                >
                  <lucide-icon name="trash-2" [size]="14" [strokeWidth]="2"></lucide-icon>
                </button>
              </div>
            }
          </div>
        }
      </div>

      <!-- Usage hint -->
      <div class="usage-card">
        <div class="usage-head">
          <lucide-icon name="shield" [size]="14" [strokeWidth]="2"></lucide-icon>
          <span class="font-mono">USAGE</span>
        </div>
        <pre class="usage-snippet font-mono">curl -H "Authorization: Bearer dvs_..." \\
  https://your-vault/api/concepts</pre>
        <p class="usage-note">
          Rate limit: <span class="font-mono">60 requests / minute</span> per token.
          Tokens cannot manage other tokens — use the web UI for that.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 1rem 0; max-width: 56rem; }

    .back-link {
      display: inline-flex; align-items: center; gap: .375rem;
      font-size: .8125rem;
      color: var(--muted-foreground);
      text-decoration: none;
      margin-bottom: 1rem;
    }
    .back-link:hover { color: var(--foreground); }

    .page-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .page-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--foreground);
      margin-bottom: .25rem;
    }
    .page-subtitle {
      font-size: .875rem;
      color: var(--muted-foreground);
      max-width: 42rem;
      line-height: 1.55;
    }

    /* ---------- buttons ---------- */
    .btn-primary, .btn-ghost {
      display: inline-flex; align-items: center; justify-content: center;
      gap: .375rem;
      height: 2.25rem;
      padding: 0 .875rem;
      font-size: .8125rem;
      font-weight: 500;
      border-radius: calc(var(--radius) - 2px);
      border: 1px solid transparent;
      cursor: pointer;
      flex-shrink: 0;
      transition: background-color .12s ease, border-color .12s ease, color .12s ease;
    }
    .btn-primary {
      background: var(--primary);
      color: var(--primary-foreground);
    }
    .btn-primary:hover:not(:disabled) {
      background: color-mix(in srgb, var(--primary) 88%, #000);
    }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .btn-ghost {
      background: transparent;
      color: var(--foreground);
      border-color: var(--border);
    }
    .btn-ghost:hover:not(:disabled) { background: var(--secondary); }
    .btn-ghost:disabled { opacity: .5; cursor: not-allowed; }

    .btn-ghost-icon, .btn-danger-icon {
      display: inline-flex; align-items: center; justify-content: center;
      width: 2rem; height: 2rem;
      border-radius: calc(var(--radius) - 3px);
      border: 1px solid var(--border);
      background: transparent;
      color: var(--muted-foreground);
      cursor: pointer;
      transition: background-color .12s ease, color .12s ease, border-color .12s ease;
      flex-shrink: 0;
    }
    .btn-ghost-icon:hover { background: var(--secondary); color: var(--foreground); }
    .btn-danger-icon:hover:not(:disabled) {
      color: var(--destructive);
      border-color: var(--destructive);
      background: color-mix(in srgb, var(--destructive) 8%, transparent);
    }
    .btn-danger-icon:disabled { opacity: .5; cursor: not-allowed; }

    /* ---------- reveal panel (one-shot) ---------- */
    .reveal-card {
      position: relative;
      background: var(--card);
      border: 1px solid var(--border);
      border-left: 3px solid var(--primary);
      border-radius: var(--radius);
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .reveal-header {
      display: flex;
      gap: .875rem;
      margin-bottom: 1rem;
    }
    .reveal-icon {
      display: inline-flex; align-items: center; justify-content: center;
      width: 2rem; height: 2rem;
      border-radius: calc(var(--radius) - 3px);
      background: color-mix(in srgb, var(--primary) 12%, transparent);
      color: var(--primary);
      flex-shrink: 0;
    }
    .reveal-eyebrow {
      font-size: .6875rem;
      letter-spacing: .12em;
      font-weight: 600;
      color: var(--primary);
      text-transform: uppercase;
      margin-bottom: .25rem;
    }
    .reveal-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--foreground);
      margin: 0 0 .25rem;
    }
    .reveal-message {
      font-size: .8125rem;
      color: var(--muted-foreground);
      margin: 0;
      line-height: 1.5;
    }

    .reveal-token-row {
      display: flex; align-items: stretch; gap: .5rem;
      margin-bottom: .75rem;
    }
    .reveal-token {
      flex: 1;
      min-width: 0;
      padding: .625rem .75rem;
      background: var(--secondary);
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) - 2px);
      font-size: .8125rem;
      color: var(--foreground);
      overflow-x: auto;
      white-space: nowrap;
    }

    .reveal-meta {
      display: flex; flex-wrap: wrap; gap: .5rem;
      font-size: .6875rem;
      color: var(--muted-foreground);
      margin-bottom: 1rem;
    }
    .reveal-actions { display: flex; justify-content: flex-end; }

    /* ---------- create form ---------- */
    .create-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .create-head {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 1rem;
    }
    .create-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--foreground);
      margin: 0;
    }
    .form-row { margin-bottom: 1rem; }
    .form-label {
      display: block;
      font-size: .6875rem;
      letter-spacing: .12em;
      color: var(--muted-foreground);
      margin-bottom: .375rem;
    }
    .form-input {
      width: 100%;
      height: 2.25rem;
      padding: 0 .75rem;
      background: var(--input-background, var(--secondary));
      color: var(--foreground);
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) - 2px);
      font-size: .8125rem;
    }
    .form-input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent);
    }
    .form-hint {
      display: block;
      font-size: .6875rem;
      color: var(--muted-foreground);
      margin-top: .375rem;
    }

    .preset-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
      gap: .5rem;
    }
    .preset-btn {
      display: flex; flex-direction: column; align-items: flex-start;
      gap: .125rem;
      padding: .625rem .75rem;
      background: var(--secondary);
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) - 2px);
      color: var(--foreground);
      cursor: pointer;
      text-align: left;
      transition: border-color .12s ease, background-color .12s ease;
    }
    .preset-btn:hover:not(:disabled) { border-color: color-mix(in srgb, var(--primary) 50%, var(--border)); }
    .preset-btn.active {
      border-color: var(--primary);
      background: color-mix(in srgb, var(--primary) 8%, var(--secondary));
    }
    .preset-btn.active.never {
      border-color: var(--destructive);
      background: color-mix(in srgb, var(--destructive) 8%, var(--secondary));
    }
    .preset-btn:disabled { opacity: .5; cursor: not-allowed; }
    .preset-label {
      font-size: .8125rem;
      font-weight: 600;
      letter-spacing: .04em;
    }
    .preset-hint {
      font-size: .6875rem;
      color: var(--muted-foreground);
    }

    .admin-row { padding-top: .25rem; }
    .checkbox-row {
      display: flex; gap: .625rem; cursor: pointer;
      padding: .75rem;
      background: color-mix(in srgb, var(--accent) 6%, transparent);
      border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border));
      border-radius: calc(var(--radius) - 2px);
    }
    .checkbox-row input[type="checkbox"] {
      flex-shrink: 0; margin-top: .15rem;
      width: 1rem; height: 1rem; accent-color: var(--accent);
    }
    .checkbox-title {
      display: block;
      font-size: .75rem;
      letter-spacing: .08em;
      color: var(--accent);
      margin-bottom: .15rem;
    }
    .checkbox-hint {
      display: block;
      font-size: .75rem;
      color: var(--muted-foreground);
      line-height: 1.5;
    }

    .form-error {
      padding: .5rem .75rem;
      background: color-mix(in srgb, var(--destructive) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--destructive) 50%, var(--border));
      border-radius: calc(var(--radius) - 2px);
      color: var(--destructive);
      font-size: .75rem;
      margin-bottom: .75rem;
    }

    .form-actions {
      display: flex; gap: .5rem; justify-content: flex-end;
    }

    /* ---------- list ---------- */
    .tokens-section { margin-bottom: 1.5rem; }
    .section-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: .625rem;
    }
    .section-title {
      font-size: .6875rem;
      letter-spacing: .12em;
      color: var(--muted-foreground);
    }

    .empty {
      display: flex; flex-direction: column; align-items: center;
      gap: .625rem;
      padding: 2.5rem 1rem;
      background: var(--card);
      border: 1px dashed var(--border);
      border-radius: var(--radius);
      color: var(--muted-foreground);
      text-align: center;
    }
    .empty p { margin: 0; font-size: .875rem; }

    .token-list {
      display: flex; flex-direction: column;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .token-row {
      display: flex; align-items: center; gap: .875rem;
      padding: .875rem 1rem;
      border-bottom: 1px solid var(--border);
    }
    .token-row:last-child { border-bottom: none; }
    .token-row.expired { opacity: .6; }

    .token-icon {
      display: inline-flex; align-items: center; justify-content: center;
      width: 2rem; height: 2rem;
      border-radius: calc(var(--radius) - 3px);
      background: var(--secondary);
      color: var(--muted-foreground);
      flex-shrink: 0;
    }
    .token-main { flex: 1; min-width: 0; }
    .token-line1 {
      display: flex; align-items: center; gap: .5rem; flex-wrap: wrap;
    }
    .token-name {
      font-size: .875rem;
      font-weight: 600;
      color: var(--foreground);
    }
    .token-prefix {
      font-size: .75rem;
      color: var(--muted-foreground);
      padding: .125rem .375rem;
      background: var(--secondary);
      border-radius: calc(var(--radius) - 4px);
    }
    .token-line2 {
      display: flex; flex-wrap: wrap; gap: .5rem;
      font-size: .6875rem;
      color: var(--muted-foreground);
      margin-top: .25rem;
    }
    .meta {
      display: inline-flex; align-items: center; gap: .25rem;
    }

    .badge-admin, .badge-expired {
      display: inline-flex; align-items: center; gap: .25rem;
      font-size: .625rem;
      font-weight: 600;
      letter-spacing: .06em;
      padding: .15rem .4rem;
      border-radius: calc(var(--radius) - 4px);
      text-transform: uppercase;
    }
    .badge-admin {
      background: color-mix(in srgb, var(--accent) 12%, transparent);
      color: var(--accent);
    }
    .badge-expired {
      background: color-mix(in srgb, var(--destructive) 12%, transparent);
      color: var(--destructive);
    }

    /* ---------- usage ---------- */
    .usage-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1rem 1.25rem;
    }
    .usage-head {
      display: flex; align-items: center; gap: .375rem;
      font-size: .6875rem;
      letter-spacing: .12em;
      color: var(--muted-foreground);
      margin-bottom: .625rem;
    }
    .usage-snippet {
      margin: 0 0 .625rem;
      padding: .625rem .75rem;
      background: var(--secondary);
      border-radius: calc(var(--radius) - 2px);
      font-size: .75rem;
      color: var(--foreground);
      overflow-x: auto;
      white-space: pre;
    }
    .usage-note {
      margin: 0;
      font-size: .75rem;
      color: var(--muted-foreground);
      line-height: 1.55;
    }

    @media (max-width: 640px) {
      .page-head { flex-direction: column; }
      .token-row { flex-wrap: wrap; }
    }
  `],
})
export class ApiTokensComponent {
  readonly MAX_TOKENS = 10;
  readonly expiryOptions: ExpiryOption[] = [
    { value: '7d', label: '7 days', hint: 'short-lived' },
    { value: '30d', label: '30 days', hint: 'recommended' },
    { value: '90d', label: '90 days', hint: 'rotate often' },
    { value: '1y', label: '1 year', hint: 'long-lived' },
    { value: 'never', label: 'Never', hint: 'no expiry · risky' },
  ];

  private readonly tokenService = inject(ApiTokenService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly notify = inject(NotificationService);

  readonly userData = toSignal(this.auth.userData$, { initialValue: null });
  readonly isAdmin = computed(() => {
    const u = this.userData();
    return !!u && (u.roles.includes('admin') || u.roles.includes('ROLE_ADMIN'));
  });

  readonly tokens = signal<ApiToken[]>([]);
  readonly loading = signal<boolean>(true);
  readonly showCreate = signal<boolean>(false);
  readonly creating = signal<boolean>(false);
  readonly createError = signal<string | null>(null);
  readonly revealed = signal<ApiTokenCreated | null>(null);
  readonly revokingId = signal<string | null>(null);

  readonly name = signal<string>('');
  readonly expiry = signal<ApiTokenExpiryPreset>('30d');
  readonly includeAdmin = signal<boolean>(false);

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.tokenService.list().subscribe({
      next: tokens => {
        this.tokens.set(tokens);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.push('API Tokens', 'Failed to load tokens.', 'error');
      },
    });
  }

  openCreate(): void {
    this.name.set('');
    this.expiry.set('30d');
    this.includeAdmin.set(false);
    this.createError.set(null);
    this.showCreate.set(true);
  }

  cancelCreate(): void {
    this.showCreate.set(false);
    this.createError.set(null);
  }

  toggleIncludeAdmin(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.includeAdmin.set(checked);
  }

  submitCreate(): void {
    const name = this.name().trim();
    if (!name) return;

    this.creating.set(true);
    this.createError.set(null);

    this.tokenService
      .create({
        name,
        expiry: this.expiry(),
        includeAdmin: this.includeAdmin(),
      })
      .subscribe({
        next: created => {
          this.creating.set(false);
          this.showCreate.set(false);
          this.revealed.set(created);
          this.refresh();
        },
        error: err => {
          this.creating.set(false);
          this.createError.set(
            err?.error?.error
              ?? err?.error?.errors?.[0]?.message
              ?? 'Failed to create token.',
          );
        },
      });
  }

  dismissReveal(): void {
    this.revealed.set(null);
  }

  async copyToken(token: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(token);
      this.notify.push('API Tokens', 'Token copied to clipboard.', 'success');
    } catch {
      this.notify.push('API Tokens', 'Failed to copy. Select and copy manually.', 'error');
    }
  }

  async revoke(token: ApiToken): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Revoke token',
      message: `"${token.name}" (${token.prefix}…) will stop working immediately. This cannot be undone.`,
      confirmLabel: 'Revoke',
      variant: 'destructive',
    });
    if (!ok) return;

    this.revokingId.set(token.id);
    this.tokenService.revoke(token.id).subscribe({
      next: () => {
        this.revokingId.set(null);
        this.tokens.update(list => list.filter(t => t.id !== token.id));
        this.notify.push('API Tokens', 'Token revoked.', 'success');
      },
      error: () => {
        this.revokingId.set(null);
        this.notify.push('API Tokens', 'Failed to revoke token.', 'error');
      },
    });
  }
}
