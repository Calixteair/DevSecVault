import { Component, effect, signal } from '@angular/core';
import { ToolLayoutComponent } from '../tool-layout.component';
import { TOOL_STYLES, copyToClipboard } from '../tool-ui';

type Algo = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

async function hmac(algo: Algo, key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: algo },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

@Component({
  selector: 'app-tool-hmac',
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout title="HMAC Generator" subtitle="Keyed-hash message authentication code">
      <div class="card">
        <label>
          Secret key
          <input type="text" [value]="key()" (input)="onKey($event)" placeholder="shared-secret" />
        </label>
        <label>
          Message
          <textarea rows="4" [value]="msg()" (input)="onMsg($event)"></textarea>
        </label>
        <label>
          Algorithm
          <select [value]="algo()" (change)="onAlgo($event)">
            <option>SHA-1</option>
            <option>SHA-256</option>
            <option>SHA-384</option>
            <option>SHA-512</option>
          </select>
        </label>
      </div>
      <div class="card">
        <label>
          HMAC (hex)
          <div class="output-val">{{ result() }}</div>
        </label>
        <div class="actions">
          <button class="btn" (click)="copy()">{{ copied() ? 'Copied!' : 'Copy' }}</button>
        </div>
      </div>
    </app-tool-layout>
  `,
  styles: [TOOL_STYLES],
})
export class HmacComponent {
  readonly key = signal('my-secret-key');
  readonly msg = signal('Hello world');
  readonly algo = signal<Algo>('SHA-256');
  readonly result = signal('');
  readonly copied = signal(false);

  constructor() {
    effect(async () => {
      try {
        this.result.set(await hmac(this.algo(), this.key(), this.msg()));
      } catch {
        this.result.set('');
      }
    });
  }
  onKey(ev: Event) { this.key.set((ev.target as HTMLInputElement).value); }
  onMsg(ev: Event) { this.msg.set((ev.target as HTMLTextAreaElement).value); }
  onAlgo(ev: Event) { this.algo.set((ev.target as HTMLSelectElement).value as Algo); }
  async copy() {
    if (await copyToClipboard(this.result())) {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    }
  }
}
