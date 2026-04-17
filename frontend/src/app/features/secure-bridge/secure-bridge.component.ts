import { Component, computed, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import {
  LUCIDE_ICONS,
  LucideAngularModule,
  LucideIconProvider,
  AlertTriangle,
  Check,
  Copy,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  Link2,
  Lock,
  RefreshCw,
  Send,
  Shield,
  Upload,
} from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { VaultService } from '../../core/services/vault.service';
import { SecretLinkService } from '../../core/services/secret-link.service';
import { SecureBridgeCryptoService } from '../../core/services/secure-bridge-crypto.service';
import { VaultEntry } from '../../core/models/vault.model';

const icons = {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  Link2,
  Lock,
  RefreshCw,
  Send,
  Shield,
  Upload,
};

type VaultStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'locked'; entry: VaultEntry }
  | { kind: 'unlocked'; plaintext: string; entry: VaultEntry }
  | { kind: 'error'; message: string };

type LinkStatus =
  | { kind: 'idle' }
  | { kind: 'generating' }
  | { kind: 'ready'; url: string; expiresAt: string }
  | { kind: 'error'; message: string };

@Component({
  selector: 'app-secure-bridge',
  imports: [AsyncPipe, FormsModule, LucideAngularModule],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <div class="secure-bridge">
      <header class="page-header">
        <div class="page-header-icon">
          <lucide-icon name="shield" [size]="22" [strokeWidth]="2"></lucide-icon>
        </div>
        <div>
          <h1 class="page-title">SECURE BRIDGE</h1>
          <p class="page-subtitle">End-to-end encrypted transfers · the server never sees your plaintext</p>
        </div>
      </header>

      @if (!(auth.isAuthenticated$ | async)) {
        <div class="auth-wall">
          <lucide-icon name="lock" [size]="28" [strokeWidth]="2"></lucide-icon>
          <h2>Authentication required</h2>
          <p>Secure Bridge is personal. Log in to use your vault or generate share links.</p>
        </div>
      } @else {
        <div class="tabs">
          <button
            type="button"
            class="tab"
            [class.active]="activeTab() === 'vault'"
            (click)="activeTab.set('vault')">
            <lucide-icon name="key-round" [size]="16" [strokeWidth]="2"></lucide-icon>
            Personal Vault
          </button>
          <button
            type="button"
            class="tab"
            [class.active]="activeTab() === 'share'"
            (click)="activeTab.set('share')">
            <lucide-icon name="link-2" [size]="16" [strokeWidth]="2"></lucide-icon>
            Share Link
          </button>
        </div>

        @if (activeTab() === 'vault') {
          <section class="card vault-card">
            <header class="card-header">
              <h2><lucide-icon name="key-round" [size]="18" [strokeWidth]="2"></lucide-icon> Personal Vault</h2>
              <p class="card-sub">One slot per account. TTL fixed at 10 minutes. 3 failed attempts → auto-burn.</p>
            </header>

            @switch (vaultStatus().kind) {
              @case ('loading') {
                <p class="status-line">Loading…</p>
              }
              @case ('empty') {
                <div class="form-row">
                  <label class="label font-mono">Content</label>
                  <textarea
                    class="input font-mono"
                    rows="6"
                    placeholder="Paste the text you want to send to another device…"
                    [(ngModel)]="newContent"></textarea>
                </div>
                <div class="form-row">
                  <label class="label font-mono">Passphrase</label>
                  <input
                    class="input font-mono"
                    type="password"
                    placeholder="min 8 characters — you'll need to type it again on the other device"
                    [(ngModel)]="newPassphrase" />
                </div>
                <div class="actions">
                  <button
                    type="button"
                    class="btn btn-primary"
                    [disabled]="busy() || !newContent().trim() || newPassphrase().length < 8"
                    (click)="onSaveVault()">
                    <lucide-icon name="upload" [size]="16" [strokeWidth]="2"></lucide-icon>
                    {{ busy() ? 'Encrypting…' : 'Encrypt & save' }}
                  </button>
                </div>
              }
              @case ('locked') {
                <div class="locked-banner">
                  <lucide-icon name="lock" [size]="18" [strokeWidth]="2"></lucide-icon>
                  <div>
                    <strong>Vault locked</strong>
                    <small>
                      Saved {{ formatAgo(lockedEntry()!.createdAt) }} ·
                      Expires {{ formatIn(lockedEntry()!.expiresAt) }} ·
                      {{ lockedEntry()!.remainingAttempts }} attempt(s) left
                    </small>
                  </div>
                </div>
                <div class="form-row">
                  <label class="label font-mono">Passphrase</label>
                  <input
                    class="input font-mono"
                    type="password"
                    [(ngModel)]="unlockPassphrase"
                    (keyup.enter)="onUnlockVault()" />
                </div>
                <div class="actions">
                  <button
                    type="button"
                    class="btn btn-primary"
                    [disabled]="busy() || unlockPassphrase().length < 8"
                    (click)="onUnlockVault()">
                    <lucide-icon name="eye" [size]="16" [strokeWidth]="2"></lucide-icon>
                    {{ busy() ? 'Decrypting…' : 'Decrypt' }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost"
                    [disabled]="busy()"
                    (click)="onClearVault()">
                    <lucide-icon name="flame" [size]="16" [strokeWidth]="2"></lucide-icon>
                    Burn
                  </button>
                </div>
                @if (lastError()) {
                  <p class="error-line"><lucide-icon name="alert-triangle" [size]="14"></lucide-icon> {{ lastError() }}</p>
                }
              }
              @case ('unlocked') {
                <div class="unlocked-banner">
                  <lucide-icon name="eye" [size]="18" [strokeWidth]="2"></lucide-icon>
                  <div>
                    <strong>Vault unlocked</strong>
                    <small>Expires {{ formatIn(unlockedEntry()!.expiresAt) }}</small>
                  </div>
                </div>
                <div class="form-row">
                  <label class="label font-mono">Content</label>
                  <textarea class="input font-mono" rows="8" readonly [value]="unlockedPlaintext()"></textarea>
                </div>
                <div class="actions">
                  <button type="button" class="btn btn-ghost" (click)="copyText(unlockedPlaintext())">
                    <lucide-icon name="copy" [size]="16" [strokeWidth]="2"></lucide-icon>
                    {{ copiedVault() ? 'Copied!' : 'Copy' }}
                  </button>
                  <button type="button" class="btn btn-ghost" (click)="onClearVault()">
                    <lucide-icon name="flame" [size]="16" [strokeWidth]="2"></lucide-icon>
                    Burn
                  </button>
                  <button type="button" class="btn btn-ghost" (click)="resetVaultView()">
                    <lucide-icon name="refresh-cw" [size]="16" [strokeWidth]="2"></lucide-icon>
                    New entry
                  </button>
                </div>
              }
              @case ('error') {
                <p class="error-line"><lucide-icon name="alert-triangle" [size]="14"></lucide-icon> {{ errorMessage() }}</p>
                <div class="actions">
                  <button type="button" class="btn btn-ghost" (click)="reloadVault()">Retry</button>
                </div>
              }
            }
          </section>

          <section class="notice">
            <lucide-icon name="shield" [size]="18" [strokeWidth]="2"></lucide-icon>
            <div>
              <strong class="font-mono">HOW IT WORKS</strong>
              <p>Your passphrase never leaves this browser. We derive a 256-bit key locally (Argon2id), encrypt your content with AES-256-GCM, and only upload the ciphertext + salt. Even the server admin can't read it.</p>
            </div>
          </section>
        }

        @if (activeTab() === 'share') {
          <section class="card share-card">
            <header class="card-header">
              <h2><lucide-icon name="link-2" [size]="18" [strokeWidth]="2"></lucide-icon> Share Link</h2>
              <p class="card-sub">One-shot link. TTL 10 min. The key lives in the URL fragment and never reaches the server.</p>
            </header>

            <div class="form-row">
              <label class="label font-mono">Content</label>
              <textarea
                class="input font-mono"
                rows="6"
                placeholder="Paste the secret you want to share…"
                [(ngModel)]="shareContent"></textarea>
            </div>

            <div class="toggles">
              <label class="toggle">
                <input type="checkbox" [(ngModel)]="requireConfirmation" />
                <span class="toggle-label">
                  <strong>Require confirmation</strong>
                  <small>Recipient must click "Reveal" — blocks email-preview bots from burning the link.</small>
                </span>
              </label>
              <label class="toggle">
                <input type="checkbox" [(ngModel)]="requireAuth" />
                <span class="toggle-label">
                  <strong>Require login</strong>
                  <small>Only users logged into DevSecVault can open the link.</small>
                </span>
              </label>
            </div>

            <div class="actions">
              <button
                type="button"
                class="btn btn-primary"
                [disabled]="busy() || !shareContent().trim()"
                (click)="onGenerateLink()">
                <lucide-icon name="send" [size]="16" [strokeWidth]="2"></lucide-icon>
                {{ busy() ? 'Encrypting…' : 'Generate link' }}
              </button>
            </div>

            @switch (linkStatus().kind) {
              @case ('ready') {
                <div class="link-result">
                  <label class="label font-mono">Share URL</label>
                  <div class="url-box font-mono">{{ readyUrl() }}</div>
                  <div class="actions">
                    <button type="button" class="btn btn-ghost" (click)="copyText(readyUrl())">
                      <lucide-icon name="copy" [size]="16" [strokeWidth]="2"></lucide-icon>
                      {{ copiedLink() ? 'Copied!' : 'Copy link' }}
                    </button>
                    <button type="button" class="btn btn-ghost" (click)="resetShare()">
                      <lucide-icon name="refresh-cw" [size]="16" [strokeWidth]="2"></lucide-icon>
                      New link
                    </button>
                  </div>
                  <p class="hint">Expires {{ formatIn(readyExpiresAt()) }}. First successful decrypt will burn it.</p>
                </div>
              }
              @case ('error') {
                <p class="error-line"><lucide-icon name="alert-triangle" [size]="14"></lucide-icon> {{ shareErrorMessage() }}</p>
              }
            }
          </section>

          <section class="notice">
            <lucide-icon name="shield" [size]="18" [strokeWidth]="2"></lucide-icon>
            <div>
              <strong class="font-mono">E2E GUARANTEES</strong>
              <p>The encryption key is a random 256-bit value generated in your browser and placed in the URL fragment (<span class="font-mono">#…</span>). Fragments are never sent to the server. Delete the link from wherever you sent it to revoke access before it expires.</p>
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .secure-bridge {
      max-width: 880px;
      margin: 0 auto;
      padding: 1.5rem 0 3rem;
      display: flex; flex-direction: column; gap: 1.5rem;
    }
    .page-header { display: flex; align-items: center; gap: 0.875rem; }
    .page-header-icon {
      width: 40px; height: 40px; border-radius: var(--radius);
      background: color-mix(in srgb, var(--destructive) 18%, transparent);
      color: var(--destructive);
      display: flex; align-items: center; justify-content: center;
      border: 1px solid color-mix(in srgb, var(--destructive) 35%, transparent);
    }
    .page-title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 1.25rem; font-weight: 700; letter-spacing: 0.08em;
      color: var(--destructive); margin: 0;
    }
    .page-subtitle { margin: 0.125rem 0 0; font-size: 0.875rem; color: var(--muted-foreground); }

    .auth-wall {
      padding: 3rem 1.5rem; text-align: center;
      background: var(--card); border: 1px dashed var(--border); border-radius: var(--radius);
      color: var(--muted-foreground);
      display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
    }
    .auth-wall h2 { color: var(--foreground); margin: 0.5rem 0 0; }
    .auth-wall p { margin: 0; }

    .tabs {
      display: flex; gap: 0.25rem; padding: 0.25rem;
      background: var(--secondary); border-radius: var(--radius); width: fit-content;
    }
    .tab {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.5rem 0.875rem;
      font-size: 0.875rem; font-weight: 500;
      color: var(--muted-foreground);
      background: transparent; border: none; border-radius: calc(var(--radius) - 0.125rem);
      cursor: pointer; transition: all 0.15s;
    }
    .tab:hover { color: var(--foreground); }
    .tab.active {
      background: var(--card); color: var(--destructive);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .card {
      background: var(--card);
      border: 2px solid color-mix(in srgb, var(--destructive) 40%, var(--border));
      border-radius: var(--radius);
      padding: 1.5rem;
      display: flex; flex-direction: column; gap: 1rem;
    }
    .card-header h2 {
      display: inline-flex; align-items: center; gap: 0.5rem;
      font-size: 1rem; font-weight: 700; margin: 0;
      color: var(--destructive); font-family: 'JetBrains Mono', monospace;
      letter-spacing: 0.04em; text-transform: uppercase;
    }
    .card-sub { margin: 0.25rem 0 0; font-size: 0.8125rem; color: var(--muted-foreground); }

    .form-row { display: flex; flex-direction: column; gap: 0.375rem; }
    .label { font-size: 0.75rem; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.04em; }
    .input {
      width: 100%; padding: 0.625rem 0.75rem;
      background: var(--input-background); border: 1px solid var(--border);
      border-radius: var(--radius); color: var(--foreground);
      font-size: 0.875rem; font-family: inherit;
      transition: border-color 0.15s;
      box-sizing: border-box;
    }
    textarea.input { resize: vertical; min-height: 5rem; }
    .input.font-mono { font-family: 'JetBrains Mono', monospace; }
    .input:focus { outline: none; border-color: var(--destructive); }

    .toggles { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    @media (max-width: 640px) { .toggles { grid-template-columns: 1fr; } }
    .toggle {
      display: flex; gap: 0.625rem; align-items: flex-start;
      padding: 0.75rem; border: 1px solid var(--border); border-radius: var(--radius);
      cursor: pointer; background: color-mix(in srgb, var(--secondary) 40%, transparent);
    }
    .toggle input { margin-top: 0.25rem; accent-color: var(--destructive); }
    .toggle-label { display: flex; flex-direction: column; gap: 0.125rem; }
    .toggle-label strong { font-size: 0.875rem; color: var(--foreground); font-weight: 600; }
    .toggle-label small { font-size: 0.75rem; color: var(--muted-foreground); }

    .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .btn {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.5rem 0.875rem;
      font-size: 0.875rem; font-weight: 500;
      border-radius: var(--radius); border: 1px solid transparent;
      cursor: pointer; transition: all 0.15s;
      background: var(--secondary); color: var(--foreground);
    }
    .btn:hover:not(:disabled) { background: color-mix(in srgb, var(--secondary) 70%, var(--foreground) 10%); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary {
      background: var(--destructive); color: var(--destructive-foreground); border-color: var(--destructive);
    }
    .btn-primary:hover:not(:disabled) {
      background: color-mix(in srgb, var(--destructive) 90%, black 10%);
    }
    .btn-ghost { background: transparent; border-color: var(--border); }

    .locked-banner,
    .unlocked-banner {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: color-mix(in srgb, var(--destructive) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--destructive) 35%, transparent);
      border-radius: var(--radius);
      color: var(--destructive);
    }
    .locked-banner strong, .unlocked-banner strong { display: block; font-size: 0.875rem; }
    .locked-banner small, .unlocked-banner small { color: var(--muted-foreground); display: block; font-size: 0.75rem; }

    .status-line { color: var(--muted-foreground); font-size: 0.875rem; margin: 0; }
    .error-line {
      display: inline-flex; align-items: center; gap: 0.375rem;
      color: var(--destructive); font-size: 0.8125rem; margin: 0;
    }
    .hint { font-size: 0.75rem; color: var(--muted-foreground); margin: 0.25rem 0 0; }

    .link-result { display: flex; flex-direction: column; gap: 0.5rem; }
    .url-box {
      padding: 0.625rem 0.75rem;
      background: var(--input-background); border: 1px solid var(--border);
      border-radius: var(--radius); font-size: 0.8125rem;
      color: var(--foreground); word-break: break-all;
    }

    .notice {
      display: flex; gap: 0.75rem;
      background: color-mix(in srgb, var(--destructive) 8%, transparent);
      border: 1px solid color-mix(in srgb, var(--destructive) 30%, transparent);
      border-radius: var(--radius);
      padding: 1rem;
      color: var(--foreground);
    }
    .notice strong { display: block; font-size: 0.75rem; letter-spacing: 0.04em; color: var(--destructive); margin-bottom: 0.25rem; }
    .notice p { margin: 0; font-size: 0.8125rem; color: var(--muted-foreground); }

    @media (max-width: 768px) {
      .secure-bridge { padding: 1rem 0; gap: 1rem; }
      .card { padding: 1rem; }
      .tabs { width: 100%; }
      .tab-btn { flex: 1; justify-content: center; }
      .actions { flex-direction: column; }
      .actions .btn { width: 100%; justify-content: center; }
    }
  `],
})
export class SecureBridgeComponent {
  protected readonly auth = inject(AuthService);
  private readonly crypto = inject(SecureBridgeCryptoService);
  private readonly vaultService = inject(VaultService);
  private readonly linkService = inject(SecretLinkService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly activeTab = signal<'vault' | 'share'>('vault');
  readonly busy = signal(false);

  // --- Vault state ---------------------------------------------------------
  readonly vaultStatus = signal<VaultStatus>({ kind: 'idle' });
  readonly newContent = signal('');
  readonly newPassphrase = signal('');
  readonly unlockPassphrase = signal('');
  readonly lastError = signal<string | null>(null);
  readonly copiedVault = signal(false);
  readonly lockedEntry = computed(() => {
    const s = this.vaultStatus();
    return s.kind === 'locked' ? s.entry : null;
  });
  readonly unlockedEntry = computed(() => {
    const s = this.vaultStatus();
    return s.kind === 'unlocked' ? s.entry : null;
  });
  readonly unlockedPlaintext = computed(() => {
    const s = this.vaultStatus();
    return s.kind === 'unlocked' ? s.plaintext : '';
  });
  readonly errorMessage = computed(() => {
    const s = this.vaultStatus();
    return s.kind === 'error' ? s.message : '';
  });

  // --- Share state ---------------------------------------------------------
  readonly shareContent = signal('');
  readonly requireConfirmation = signal(true);
  readonly requireAuth = signal(false);
  readonly linkStatus = signal<LinkStatus>({ kind: 'idle' });
  readonly copiedLink = signal(false);
  readonly readyUrl = computed(() => {
    const s = this.linkStatus();
    return s.kind === 'ready' ? s.url : '';
  });
  readonly readyExpiresAt = computed(() => {
    const s = this.linkStatus();
    return s.kind === 'ready' ? s.expiresAt : '';
  });
  readonly shareErrorMessage = computed(() => {
    const s = this.linkStatus();
    return s.kind === 'error' ? s.message : '';
  });

  constructor() {
    this.auth.isAuthenticated$.subscribe((authed: boolean) => {
      if (authed) this.reloadVault();
    });
  }

  // -------------------------------------------------------------------------
  // Vault
  // -------------------------------------------------------------------------

  reloadVault(): void {
    this.vaultStatus.set({ kind: 'loading' });
    this.lastError.set(null);
    this.vaultService.get().subscribe({
      next: entry => this.vaultStatus.set({ kind: 'locked', entry }),
      error: (err: HttpErrorResponse) => {
        if (err.status === 404) {
          this.vaultStatus.set({ kind: 'empty' });
        } else {
          this.vaultStatus.set({ kind: 'error', message: this.describeHttpError(err) });
        }
      },
    });
  }

  async onSaveVault(): Promise<void> {
    const content = this.newContent().trim();
    const passphrase = this.newPassphrase();
    if (!content || passphrase.length < 8) return;

    this.busy.set(true);
    this.lastError.set(null);
    try {
      const saltBytes = this.crypto.randomSalt();
      const key = await this.crypto.deriveKey(passphrase, saltBytes);
      const ciphertext = await this.crypto.encrypt(content, key);
      const salt = this.crypto.bytesToBase64(saltBytes);

      this.vaultService.upsert({ ciphertext, salt }).subscribe({
        next: entry => {
          this.newContent.set('');
          this.newPassphrase.set('');
          this.vaultStatus.set({ kind: 'locked', entry });
        },
        error: (err: HttpErrorResponse) => {
          this.vaultStatus.set({ kind: 'error', message: this.describeHttpError(err) });
        },
        complete: () => this.busy.set(false),
      });
    } catch {
      this.busy.set(false);
      this.vaultStatus.set({ kind: 'error', message: 'Encryption failed. Please try again.' });
    }
  }

  async onUnlockVault(): Promise<void> {
    const s = this.vaultStatus();
    if (s.kind !== 'locked') return;
    const passphrase = this.unlockPassphrase();
    if (passphrase.length < 8) return;

    this.busy.set(true);
    this.lastError.set(null);
    try {
      const saltBytes = this.crypto.base64ToBytes(s.entry.salt);
      const key = await this.crypto.deriveKey(passphrase, saltBytes);
      const plaintext = await this.crypto.decrypt(s.entry.ciphertext, key);
      // Decrypt OK → reveal; do NOT burn automatically (user can keep reading).
      this.unlockPassphrase.set('');
      this.vaultStatus.set({ kind: 'unlocked', plaintext, entry: s.entry });
      this.busy.set(false);
    } catch {
      this.busy.set(false);
      this.vaultService.reportFailedAttempt().subscribe({
        next: result => {
          if (result.burned) {
            this.lastError.set('Too many failed attempts — vault burned.');
            this.vaultStatus.set({ kind: 'empty' });
          } else {
            this.lastError.set(`Wrong passphrase. ${result.remainingAttempts} attempt(s) left.`);
            // Refresh the locked entry so the counter is accurate.
            this.reloadVault();
          }
        },
        error: () => {
          this.lastError.set('Wrong passphrase.');
        },
      });
    }
  }

  async onClearVault(): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Burn vault?',
      message: 'The ciphertext will be destroyed on the server. This cannot be undone.',
      confirmLabel: 'Burn',
      variant: 'destructive',
    });
    if (!ok) return;

    this.busy.set(true);
    this.vaultService.clear().subscribe({
      next: () => {
        this.resetVaultView();
        this.vaultStatus.set({ kind: 'empty' });
      },
      error: () => this.vaultStatus.set({ kind: 'empty' }),
      complete: () => this.busy.set(false),
    });
  }

  resetVaultView(): void {
    this.unlockPassphrase.set('');
    this.newContent.set('');
    this.newPassphrase.set('');
    this.lastError.set(null);
    this.reloadVault();
  }

  // -------------------------------------------------------------------------
  // Share link
  // -------------------------------------------------------------------------

  async onGenerateLink(): Promise<void> {
    const content = this.shareContent().trim();
    if (!content) return;

    this.busy.set(true);
    this.linkStatus.set({ kind: 'generating' });
    try {
      const { key, keyBase64 } = await this.crypto.generateRandomKey();
      const ciphertext = await this.crypto.encrypt(content, key);

      this.linkService.create({
        ciphertext,
        requireConfirmation: this.requireConfirmation(),
        requireAuth: this.requireAuth(),
      }).subscribe({
        next: created => {
          const url = `${window.location.origin}/secret/${created.id}#${keyBase64}`;
          this.linkStatus.set({ kind: 'ready', url, expiresAt: created.expiresAt });
          this.shareContent.set('');
        },
        error: (err: HttpErrorResponse) => {
          this.linkStatus.set({ kind: 'error', message: this.describeHttpError(err) });
        },
        complete: () => this.busy.set(false),
      });
    } catch {
      this.busy.set(false);
      this.linkStatus.set({ kind: 'error', message: 'Encryption failed. Please try again.' });
    }
  }

  resetShare(): void {
    this.linkStatus.set({ kind: 'idle' });
    this.shareContent.set('');
    this.requireConfirmation.set(true);
    this.requireAuth.set(false);
  }

  // -------------------------------------------------------------------------
  // UI helpers
  // -------------------------------------------------------------------------

  async copyText(value: string): Promise<void> {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      if (this.activeTab() === 'vault') {
        this.copiedVault.set(true);
        setTimeout(() => this.copiedVault.set(false), 1500);
      } else {
        this.copiedLink.set(true);
        setTimeout(() => this.copiedLink.set(false), 1500);
      }
    } catch {
      // Ignore clipboard failures — user can still copy manually.
    }
  }

  formatIn(iso: string): string {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return 'now';
    const mins = Math.round(ms / 60000);
    if (mins < 1) return 'in <1 min';
    return `in ${mins} min`;
  }

  formatAgo(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60000) return 'just now';
    const mins = Math.round(ms / 60000);
    return `${mins} min ago`;
  }

  private describeHttpError(err: HttpErrorResponse): string {
    if (err.status === 0) return 'Network error — is the API reachable?';
    if (err.error && typeof err.error === 'object' && 'error' in err.error) {
      return String(err.error.error);
    }
    return `HTTP ${err.status} — ${err.statusText || 'request failed'}`;
  }
}
