import { Component, computed, signal } from '@angular/core';
import { ToolLayoutComponent } from '../tool-layout.component';
import { TOOL_STYLES, copyToClipboard } from '../tool-ui';

interface Parsed {
  header: unknown;
  payload: unknown;
  signature: string;
  isExpired: boolean | null;
  expiresIn: string | null;
  issuedAgo: string | null;
}

function b64UrlDecode(s: string): string {
  const p = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4);
  const bin = atob(p);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function formatRelative(deltaMs: number): string {
  const sec = Math.round(deltaMs / 1000);
  const past = sec < 0;
  const abs = Math.abs(sec);
  if (abs < 60) return (past ? '' : 'in ') + abs + 's' + (past ? ' ago' : '');
  if (abs < 3600) return (past ? '' : 'in ') + Math.round(abs / 60) + 'min' + (past ? ' ago' : '');
  if (abs < 86400) return (past ? '' : 'in ') + Math.round(abs / 3600) + 'h' + (past ? ' ago' : '');
  return (past ? '' : 'in ') + Math.round(abs / 86400) + 'd' + (past ? ' ago' : '');
}

@Component({
  selector: 'app-tool-jwt-parser',
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout title="JWT Parser" subtitle="Decode a JSON Web Token (signature is NOT verified)">
      <div class="card">
        <label>
          JWT token
          <textarea rows="5" [value]="token()" (input)="onToken($event)"
                    placeholder="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.XX..."></textarea>
        </label>
        @if (err()) {
          <p class="error">{{ err() }}</p>
        }
      </div>
      @if (parsed(); as p) {
        <div class="card">
          <h3 class="card-title">Header</h3>
          <pre class="output-val">{{ pretty(p.header) }}</pre>
          <div class="actions">
            <button class="btn" (click)="copyObj(p.header)">Copy</button>
          </div>
        </div>
        <div class="card">
          <h3 class="card-title">Payload</h3>
          <pre class="output-val">{{ pretty(p.payload) }}</pre>
          <div class="actions">
            <button class="btn" (click)="copyObj(p.payload)">Copy</button>
          </div>
          @if (p.expiresIn !== null) {
            <dl class="kv">
              <dt>Issued</dt><dd>{{ p.issuedAgo ?? '—' }}</dd>
              <dt>Expires</dt>
              <dd [style.color]="p.isExpired ? 'var(--destructive)' : 'var(--foreground)'">
                {{ p.expiresIn }}{{ p.isExpired ? ' (expired)' : '' }}
              </dd>
            </dl>
          }
        </div>
        <div class="card">
          <h3 class="card-title">Signature</h3>
          <div class="output-val">{{ p.signature }}</div>
          <p class="meta">Signature is base64url-decoded but NOT verified. Use a server-side tool to verify.</p>
        </div>
      }
    </app-tool-layout>
  `,
  styles: [TOOL_STYLES + `pre.output-val { margin: 0; }`],
})
export class JwtParserComponent {
  readonly token = signal('');
  readonly err = signal('');

  readonly parsed = computed<Parsed | null>(() => {
    const t = this.token().trim();
    if (!t) { this.err.set(''); return null; }
    const parts = t.split('.');
    if (parts.length !== 3) { this.err.set('A JWT has 3 parts separated by "."'); return null; }
    try {
      const header = JSON.parse(b64UrlDecode(parts[0]));
      const payload = JSON.parse(b64UrlDecode(parts[1]));
      this.err.set('');
      const now = Date.now();
      const exp = (payload as { exp?: number }).exp;
      const iat = (payload as { iat?: number }).iat;
      return {
        header,
        payload,
        signature: parts[2],
        isExpired: typeof exp === 'number' ? exp * 1000 < now : null,
        expiresIn: typeof exp === 'number' ? formatRelative(exp * 1000 - now) : null,
        issuedAgo: typeof iat === 'number' ? formatRelative(iat * 1000 - now) : null,
      };
    } catch (e) {
      this.err.set('Decoding failed: ' + (e as Error).message);
      return null;
    }
  });

  onToken(ev: Event) { this.token.set((ev.target as HTMLTextAreaElement).value); }
  pretty(v: unknown) { return JSON.stringify(v, null, 2); }
  async copyObj(v: unknown) { await copyToClipboard(JSON.stringify(v, null, 2)); }
}
