import { Component, computed, effect, signal } from '@angular/core';
import QRCode from 'qrcode';
import { ToolLayoutComponent } from '../tool-layout.component';
import { TOOL_STYLES, copyToClipboard } from '../tool-ui';

// RFC 3548 Base32 decode (A-Z 2-7) → Uint8Array
function base32Decode(s: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = s.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const out = new Uint8Array(Math.floor((cleaned.length * 5) / 8));
  let bits = 0, value = 0, idx = 0;
  for (const ch of cleaned) {
    const v = alphabet.indexOf(ch);
    if (v < 0) continue;
    value = (value << 5) | v;
    bits += 5;
    if (bits >= 8) {
      out[idx++] = (value >>> (bits - 8)) & 0xff;
      bits -= 8;
    }
  }
  return out.slice(0, idx);
}

async function generateTOTP(secretB32: string, digits: number, period: number, algo: 'SHA-1' | 'SHA-256' | 'SHA-512' = 'SHA-1'): Promise<{ code: string; remaining: number }> {
  const secret = base32Decode(secretB32);
  if (secret.length === 0) return { code: '000000', remaining: period };
  const t = Math.floor(Date.now() / 1000 / period);
  const remaining = period - (Math.floor(Date.now() / 1000) % period);
  const counter = new ArrayBuffer(8);
  const view = new DataView(counter);
  view.setUint32(4, t, false);
  const key = await crypto.subtle.importKey('raw', secret as BufferSource, { name: 'HMAC', hash: algo }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, counter));
  const offset = sig[sig.length - 1] & 0x0f;
  const bin = ((sig[offset] & 0x7f) << 24) | ((sig[offset + 1] & 0xff) << 16) |
              ((sig[offset + 2] & 0xff) << 8) | (sig[offset + 3] & 0xff);
  const code = String(bin % 10 ** digits).padStart(digits, '0');
  return { code, remaining };
}

@Component({
  selector: 'app-tool-totp',
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout title="TOTP Generator" subtitle="RFC 6238 time-based one-time passwords">
      <div class="card">
        <label>
          Secret (Base32)
          <input type="text" [value]="secret()" (input)="onSecret($event)" placeholder="JBSWY3DPEHPK3PXP" />
        </label>
        <div class="row">
          <label>
            Issuer (label)
            <input type="text" [value]="issuer()" (input)="onIssuer($event)" placeholder="DevSecVault" />
          </label>
          <label>
            Account
            <input type="text" [value]="account()" (input)="onAccount($event)" placeholder="alice@example.com" />
          </label>
          <label>
            Digits
            <select [value]="digits()" (change)="onDigits($event)">
              <option>6</option>
              <option>8</option>
            </select>
          </label>
          <label>
            Period (s)
            <input type="number" min="15" max="120" [value]="period()" (input)="onPeriod($event)" />
          </label>
        </div>
        <label>
          Current code
          <div class="totp-code">{{ code() }}</div>
        </label>
        <div class="totp-progress" aria-hidden="true">
          <div class="totp-bar" [style.width.%]="(remaining() / period()) * 100"></div>
        </div>
        <div class="meta">Refreshes in {{ remaining() }}s</div>
        <div class="actions">
          <button class="btn" (click)="copy()">{{ copied() ? 'Copied!' : 'Copy code' }}</button>
        </div>
      </div>
      @if (qrDataUrl()) {
        <div class="card">
          <h3 class="card-title">Provisioning URI QR code</h3>
          <img [src]="qrDataUrl()" width="220" height="220" alt="TOTP QR" class="totp-qr" />
          <div class="output-val">{{ otpauth() }}</div>
        </div>
      }
    </app-tool-layout>
  `,
  styles: [TOOL_STYLES, `
    .totp-code {
      font-family: 'JetBrains Mono', monospace;
      font-size: clamp(2rem, 8vw, 2.75rem);
      font-weight: 600;
      letter-spacing: 0.15em;
      text-align: center;
      padding: 1rem 0.5rem;
      background: color-mix(in srgb, var(--primary) 8%, transparent);
      border: 1px solid color-mix(in srgb, var(--primary) 40%, var(--border));
      border-radius: calc(var(--radius) - 2px);
      color: var(--primary);
    }
    .totp-progress {
      height: 3px;
      background: var(--secondary);
      border-radius: 2px;
      overflow: hidden;
    }
    .totp-bar {
      height: 100%;
      background: var(--primary);
      transition: width 0.95s linear;
    }
    .totp-qr {
      background: white;
      padding: 0.5rem;
      border-radius: 0.5rem;
      align-self: flex-start;
    }
    @media (max-width: 560px) {
      .totp-qr { align-self: center; max-width: 100%; height: auto; }
    }
  `],
})
export class TotpComponent {
  readonly secret = signal('JBSWY3DPEHPK3PXP');
  readonly issuer = signal('DevSecVault');
  readonly account = signal('alice@example.com');
  readonly digits = signal(6);
  readonly period = signal(30);
  readonly code = signal('000000');
  readonly remaining = signal(30);
  readonly qrDataUrl = signal<string | null>(null);
  readonly copied = signal(false);

  readonly otpauth = computed(() => {
    const issuer = encodeURIComponent(this.issuer());
    const account = encodeURIComponent(this.account());
    return `otpauth://totp/${issuer}:${account}?secret=${this.secret()}&issuer=${issuer}&digits=${this.digits()}&period=${this.period()}`;
  });

  constructor() {
    // Recompute code every second
    setInterval(() => this.recompute(), 1000);
    // Regenerate QR when otpauth URI changes
    effect(() => {
      const uri = this.otpauth();
      QRCode.toDataURL(uri, { margin: 1, width: 220 }).then(d => this.qrDataUrl.set(d)).catch(() => this.qrDataUrl.set(null));
    });
    this.recompute();
  }

  private async recompute() {
    try {
      const { code, remaining } = await generateTOTP(this.secret(), this.digits(), this.period());
      this.code.set(code);
      this.remaining.set(remaining);
    } catch {
      this.code.set('ERROR');
    }
  }

  onSecret(ev: Event) { this.secret.set((ev.target as HTMLInputElement).value); this.recompute(); }
  onIssuer(ev: Event) { this.issuer.set((ev.target as HTMLInputElement).value); }
  onAccount(ev: Event) { this.account.set((ev.target as HTMLInputElement).value); }
  onDigits(ev: Event) { this.digits.set(Number((ev.target as HTMLSelectElement).value)); this.recompute(); }
  onPeriod(ev: Event) { this.period.set(Number((ev.target as HTMLInputElement).value)); this.recompute(); }
  async copy() {
    if (await copyToClipboard(this.code())) {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    }
  }
}
