import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  LUCIDE_ICONS,
  LucideAngularModule,
  LucideIconProvider,
  AlertTriangle,
  Copy,
  Eye,
  Flame,
  Lock,
  Shield,
} from 'lucide-angular';
import { SecretLinkService } from '../../core/services/secret-link.service';
import { SecureBridgeCryptoService } from '../../core/services/secure-bridge-crypto.service';
import { SecretLinkRead } from '../../core/models/secret-link.model';
import { AuthService } from '../../core/services/auth.service';
import { FooterComponent } from '../../layout/footer/footer.component';

const icons = { AlertTriangle, Copy, Eye, Flame, Lock, Shield };

type ViewerState =
  | { kind: 'loading' }
  | { kind: 'ready'; link: SecretLinkRead }
  | { kind: 'revealing' }
  | { kind: 'revealed'; plaintext: string }
  | { kind: 'missing-key' }
  | { kind: 'not-found' }
  | { kind: 'auth-required' }
  | { kind: 'decrypt-failed' }
  | { kind: 'error'; message: string };

@Component({
  selector: 'app-secret-viewer',
  imports: [LucideAngularModule, FooterComponent],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <div class="viewer-shell">
      <div class="viewer-panel">
        <div class="panel-icon">
          <lucide-icon name="shield" [size]="28" [strokeWidth]="2"></lucide-icon>
        </div>
        <h1 class="panel-title">SECURE TRANSFER</h1>
        <p class="panel-subtitle">End-to-end encrypted — only the URL fragment can unlock this.</p>

        @switch (state().kind) {
          @case ('loading') {
            <p class="line muted">Loading…</p>
          }
          @case ('missing-key') {
            <div class="alert">
              <lucide-icon name="alert-triangle" [size]="18"></lucide-icon>
              <div>
                <strong>Decryption key missing</strong>
                <p>The URL must include the key fragment after <span class="mono">#</span>. Ask the sender for the full link.</p>
              </div>
            </div>
          }
          @case ('not-found') {
            <div class="alert">
              <lucide-icon name="flame" [size]="18"></lucide-icon>
              <div>
                <strong>Link expired or already read</strong>
                <p>Secure Bridge links are one-shot and live for 10 minutes. Ask the sender to generate a new one.</p>
              </div>
            </div>
          }
          @case ('auth-required') {
            <div class="alert">
              <lucide-icon name="lock" [size]="18"></lucide-icon>
              <div>
                <strong>Login required</strong>
                <p>The sender restricted this link to authenticated users. Log in to continue — you'll come back here automatically.</p>
              </div>
            </div>
            <button type="button" class="btn btn-primary" (click)="loginAndReturn()">
              <lucide-icon name="lock" [size]="16" [strokeWidth]="2"></lucide-icon>
              Log in and reveal
            </button>
          }
          @case ('decrypt-failed') {
            <div class="alert">
              <lucide-icon name="alert-triangle" [size]="18"></lucide-icon>
              <div>
                <strong>Decryption failed</strong>
                <p>The key in your URL does not match the ciphertext. The link may be corrupted.</p>
              </div>
            </div>
          }
          @case ('ready') {
            @if (readyLink()!.requireConfirmation) {
              <div class="ready-banner">
                <lucide-icon name="lock" [size]="18"></lucide-icon>
                <div>
                  <strong>Secret ready to reveal</strong>
                  <small>Click below to decrypt. The link will burn immediately after.</small>
                </div>
              </div>
              <button type="button" class="btn btn-primary" (click)="onReveal()">
                <lucide-icon name="eye" [size]="16" [strokeWidth]="2"></lucide-icon>
                Reveal secret
              </button>
            } @else {
              <p class="line muted">Decrypting…</p>
            }
          }
          @case ('revealing') {
            <p class="line muted">Decrypting…</p>
          }
          @case ('revealed') {
            <div class="revealed-banner">
              <lucide-icon name="eye" [size]="18"></lucide-icon>
              <div>
                <strong>Decrypted</strong>
                <small>Link burned. Copy the content now — it won't be available again.</small>
              </div>
            </div>
            <textarea class="plaintext mono" rows="10" readonly [value]="revealedPlaintext()"></textarea>
            <button type="button" class="btn btn-ghost" (click)="copy()">
              <lucide-icon name="copy" [size]="16" [strokeWidth]="2"></lucide-icon>
              {{ copied() ? 'Copied!' : 'Copy' }}
            </button>
          }
          @case ('error') {
            <div class="alert">
              <lucide-icon name="alert-triangle" [size]="18"></lucide-icon>
              <div>
                <strong>Unexpected error</strong>
                <p>{{ errorMessage() }}</p>
              </div>
            </div>
          }
        }

        <footer class="panel-footer mono">
          <lucide-icon name="shield" [size]="12" [strokeWidth]="2"></lucide-icon>
          DevSecVault · Secure Bridge
        </footer>
      </div>
      <app-footer />
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: radial-gradient(1200px 600px at 50% -10%, color-mix(in srgb, var(--destructive) 18%, transparent), transparent 70%), var(--background);
    }
    .viewer-shell {
      min-height: 100vh;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 2rem 1.25rem 0;
      gap: 2rem;
    }
    .viewer-shell app-footer { width: 100%; align-self: stretch; }
    .viewer-panel {
      width: 100%; max-width: 540px;
      background: var(--card);
      border: 2px solid color-mix(in srgb, var(--destructive) 45%, var(--border));
      border-radius: var(--radius);
      padding: 2rem 1.75rem 1.25rem;
      display: flex; flex-direction: column; align-items: center; gap: 0.875rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45);
    }
    .panel-icon {
      width: 56px; height: 56px; border-radius: 999px;
      background: color-mix(in srgb, var(--destructive) 14%, transparent);
      color: var(--destructive);
      display: flex; align-items: center; justify-content: center;
      border: 1px solid color-mix(in srgb, var(--destructive) 40%, transparent);
    }
    .panel-title {
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: 0.15em;
      color: var(--destructive);
      font-size: 1.125rem; font-weight: 700; margin: 0;
    }
    .panel-subtitle { margin: 0; font-size: 0.8125rem; color: var(--muted-foreground); text-align: center; }

    .line { font-size: 0.875rem; margin: 0.5rem 0; }
    .muted { color: var(--muted-foreground); }

    .alert, .ready-banner, .revealed-banner {
      display: flex; align-items: flex-start; gap: 0.75rem;
      padding: 0.875rem 1rem;
      background: color-mix(in srgb, var(--destructive) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--destructive) 35%, transparent);
      border-radius: var(--radius);
      color: var(--destructive);
      width: 100%; box-sizing: border-box;
    }
    .alert strong, .ready-banner strong, .revealed-banner strong { display: block; font-size: 0.875rem; }
    .alert p, .ready-banner small, .revealed-banner small {
      display: block; margin: 0.25rem 0 0;
      color: var(--muted-foreground); font-size: 0.8125rem;
    }

    .btn {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.625rem 1rem;
      font-size: 0.875rem; font-weight: 500;
      border-radius: var(--radius); border: 1px solid transparent;
      cursor: pointer; transition: all 0.15s;
    }
    .btn-primary {
      background: var(--destructive); color: var(--destructive-foreground); border-color: var(--destructive);
    }
    .btn-primary:hover { background: color-mix(in srgb, var(--destructive) 88%, black); }
    .btn-ghost {
      background: transparent; color: var(--foreground); border-color: var(--border);
    }
    .btn-ghost:hover { background: var(--secondary); }

    .plaintext {
      width: 100%; box-sizing: border-box;
      padding: 0.75rem 0.875rem;
      background: var(--input-background); border: 1px solid var(--border);
      border-radius: var(--radius); color: var(--foreground);
      font-size: 0.875rem; resize: vertical; min-height: 8rem;
    }

    .mono { font-family: 'JetBrains Mono', monospace; }
    .link { color: var(--destructive); text-decoration: underline; }

    .panel-footer {
      margin-top: 0.5rem;
      display: inline-flex; align-items: center; gap: 0.375rem;
      color: var(--muted-foreground);
      font-size: 0.6875rem; letter-spacing: 0.08em; text-transform: uppercase;
    }

    @media (max-width: 480px) {
      .viewer-shell { padding: 1rem 0.75rem; }
      .viewer-panel { padding: 1.25rem 1rem 1rem; }
      .panel-title { font-size: 1rem; }
      .panel-icon { width: 44px; height: 44px; }
    }
  `],
})
export class SecretViewerComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly linkService = inject(SecretLinkService);
  private readonly crypto = inject(SecureBridgeCryptoService);
  private readonly auth = inject(AuthService);

  readonly state = signal<ViewerState>({ kind: 'loading' });
  readonly copied = signal(false);

  readonly readyLink = computed(() => {
    const s = this.state();
    return s.kind === 'ready' ? s.link : null;
  });
  readonly revealedPlaintext = computed(() => {
    const s = this.state();
    return s.kind === 'revealed' ? s.plaintext : '';
  });
  readonly errorMessage = computed(() => {
    const s = this.state();
    return s.kind === 'error' ? s.message : '';
  });

  private id = '';
  private fragment = '';

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.fragment = this.route.snapshot.fragment ?? '';

    if (!this.id) {
      this.state.set({ kind: 'not-found' });
      return;
    }
    if (!this.fragment) {
      this.state.set({ kind: 'missing-key' });
      return;
    }

    this.linkService.get(this.id).subscribe({
      next: link => {
        this.state.set({ kind: 'ready', link });
        // Auto-reveal if confirmation is not required.
        if (!link.requireConfirmation) {
          void this.onReveal();
        }
      },
      error: (err: HttpErrorResponse) => this.handleLoadError(err),
    });
  }

  async onReveal(): Promise<void> {
    const s = this.state();
    if (s.kind !== 'ready') return;
    const link = s.link;

    this.state.set({ kind: 'revealing' });
    try {
      const key = await this.crypto.importRandomKey(this.fragment);
      const plaintext = await this.crypto.decrypt(link.ciphertext, key);

      // Decrypt succeeded → burn on the server. Fire-and-forget; the user
      // already has the plaintext in memory so a late burn failure is fine.
      this.linkService.consume(this.id).subscribe({ error: () => void 0 });

      // Strip the #key fragment from browser history so the decryption key
      // is not exposed if the user shares their screen or history is inspected.
      history.replaceState(null, '', window.location.pathname + window.location.search);

      this.state.set({ kind: 'revealed', plaintext });
    } catch {
      this.state.set({ kind: 'decrypt-failed' });
    }
  }

  async copy(): Promise<void> {
    const text = this.revealedPlaintext();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {
      // Ignore; the textarea is selectable.
    }
  }

  /**
   * Trigger Keycloak login, preserving the current URL (including the #key
   * fragment) so the user lands back on this exact secret after the round-trip.
   */
  loginAndReturn(): void {
    const current = window.location.pathname + window.location.search + window.location.hash;
    this.auth.login(current);
  }

  private handleLoadError(err: HttpErrorResponse): void {
    if (err.status === 404) {
      this.state.set({ kind: 'not-found' });
    } else if (err.status === 401 || err.status === 403) {
      this.state.set({ kind: 'auth-required' });
    } else if (err.status === 0) {
      this.state.set({ kind: 'error', message: 'Network error — is the API reachable?' });
    } else {
      this.state.set({ kind: 'error', message: `HTTP ${err.status} — ${err.statusText || 'request failed'}` });
    }
  }
}
