import { Component, computed, signal } from '@angular/core';
import { ToolLayoutComponent } from '../tool-layout.component';
import { TOOL_STYLES, copyToClipboard } from '../tool-ui';

const CHARSETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{}<>?/.,;:',
};

function randomFrom(chars: string, n: number): string {
  const out = new Array(n);
  const buf = new Uint32Array(n);
  crypto.getRandomValues(buf);
  for (let i = 0; i < n; i++) out[i] = chars[buf[i] % chars.length];
  return out.join('');
}

function generate(len: number, opts: { lower: boolean; upper: boolean; digits: boolean; symbols: boolean }): string {
  const pool = (opts.lower ? CHARSETS.lower : '') + (opts.upper ? CHARSETS.upper : '')
    + (opts.digits ? CHARSETS.digits : '') + (opts.symbols ? CHARSETS.symbols : '');
  if (!pool) return '';
  return randomFrom(pool, len);
}

function entropy(len: number, poolSize: number): number {
  if (!poolSize) return 0;
  return Math.round(len * Math.log2(poolSize));
}

function strengthLabel(bits: number): { label: string; color: string } {
  if (bits < 40) return { label: 'Very weak', color: 'var(--destructive)' };
  if (bits < 60) return { label: 'Weak', color: '#F97316' };
  if (bits < 80) return { label: 'Fair', color: '#EAB308' };
  if (bits < 100) return { label: 'Strong', color: 'var(--primary)' };
  return { label: 'Very strong', color: 'var(--primary)' };
}

@Component({
  selector: 'app-tool-password',
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout title="Password Generator" subtitle="Cryptographically strong random passwords">
      <div class="card">
        <label>
          Length: {{ length() }}
          <input type="range" min="8" max="64" [value]="length()" (input)="onLen($event)" />
        </label>
        <div class="opt-row">
          <label class="opt">
            <input type="checkbox" [checked]="opts().lower" (change)="toggle('lower', $event)" />
            <span>Lowercase</span>
          </label>
          <label class="opt">
            <input type="checkbox" [checked]="opts().upper" (change)="toggle('upper', $event)" />
            <span>Uppercase</span>
          </label>
          <label class="opt">
            <input type="checkbox" [checked]="opts().digits" (change)="toggle('digits', $event)" />
            <span>Digits</span>
          </label>
          <label class="opt">
            <input type="checkbox" [checked]="opts().symbols" (change)="toggle('symbols', $event)" />
            <span>Symbols</span>
          </label>
        </div>
        <div class="actions">
          <button class="btn btn-primary" (click)="regenerate()">Regenerate</button>
          <button class="btn" (click)="copy()">{{ copied() ? 'Copied!' : 'Copy' }}</button>
        </div>
        <label>
          Password
          <div class="pw-out">{{ password() || '—' }}</div>
        </label>
        <div class="row">
          <div class="meta">Entropy: <strong [style.color]="strength().color">{{ bits() }} bits — {{ strength().label }}</strong></div>
          <div class="meta">Pool size: {{ poolSize() }} chars</div>
        </div>
      </div>
    </app-tool-layout>
  `,
  styles: [TOOL_STYLES, `
    .opt-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
      gap: 0.5rem;
    }
    .opt {
      display: inline-flex;
      flex-direction: row;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) - 3px);
      background: color-mix(in srgb, var(--secondary) 40%, transparent);
      cursor: pointer;
      text-transform: none;
      letter-spacing: normal;
      font-size: 0.8125rem;
      color: var(--foreground);
      transition: border-color 0.15s ease;
    }
    .opt:has(input:checked) {
      border-color: var(--primary);
      background: color-mix(in srgb, var(--primary) 10%, transparent);
    }
    .opt input { margin: 0; }
    .pw-out {
      font-family: 'JetBrains Mono', monospace;
      font-size: 1.125rem;
      letter-spacing: 0.05em;
      padding: 0.875rem 1rem;
      background: color-mix(in srgb, var(--secondary) 60%, transparent);
      border: 1px solid var(--border);
      border-left: 3px solid var(--primary);
      border-radius: calc(var(--radius) - 2px);
      word-break: break-all;
    }
  `],
})
export class PasswordComponent {
  readonly length = signal(16);
  readonly opts = signal({ lower: true, upper: true, digits: true, symbols: true });
  readonly password = signal('');
  readonly copied = signal(false);

  readonly poolSize = computed(() => {
    const o = this.opts();
    return (o.lower ? 26 : 0) + (o.upper ? 26 : 0) + (o.digits ? 10 : 0) + (o.symbols ? CHARSETS.symbols.length : 0);
  });
  readonly bits = computed(() => entropy(this.length(), this.poolSize()));
  readonly strength = computed(() => strengthLabel(this.bits()));

  constructor() { this.regenerate(); }

  onLen(ev: Event) { this.length.set(Number((ev.target as HTMLInputElement).value)); this.regenerate(); }
  toggle(key: keyof ReturnType<typeof this.opts>, ev: Event) {
    this.opts.set({ ...this.opts(), [key]: (ev.target as HTMLInputElement).checked });
    this.regenerate();
  }
  regenerate() { this.password.set(generate(this.length(), this.opts())); }
  async copy() {
    if (await copyToClipboard(this.password())) {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    }
  }
}
