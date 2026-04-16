import { Component, effect, signal } from '@angular/core';
import { md5 } from 'js-md5';
import { sha3_256, sha3_512 } from 'js-sha3';
import { ToolLayoutComponent } from '../tool-layout.component';
import { TOOL_STYLES, copyToClipboard } from '../tool-ui';

type Algo = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512' | 'SHA3-256' | 'SHA3-512';
const WEB_CRYPTO_ALGOS: Record<string, string> = {
  'SHA-1': 'SHA-1',
  'SHA-256': 'SHA-256',
  'SHA-384': 'SHA-384',
  'SHA-512': 'SHA-512',
};

async function hash(algo: Algo, text: string): Promise<string> {
  if (algo === 'MD5') return md5.hex(text);
  if (algo === 'SHA3-256') return sha3_256(text);
  if (algo === 'SHA3-512') return sha3_512(text);
  const buf = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest(WEB_CRYPTO_ALGOS[algo], buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

@Component({
  selector: 'app-tool-hash-text',
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout title="Hash Text" subtitle="Hash any text with common algorithms">
      <div class="card">
        <label>
          Input text
          <textarea rows="4" [value]="text()" (input)="onInput($event)"></textarea>
        </label>
      </div>
      <div class="card">
        @for (row of rows(); track row.algo) {
          <div class="output-row">
            <label style="flex:1">
              {{ row.algo }}
              <div class="output-val">{{ row.value }}</div>
            </label>
            <button class="btn btn-copy" (click)="copy(row.value, row.algo)"
                    [class.copied]="copiedAlgo() === row.algo" title="Copy">📋</button>
          </div>
        }
      </div>
    </app-tool-layout>
  `,
  styles: [TOOL_STYLES],
})
export class HashTextComponent {
  readonly text = signal('hello world');
  readonly rows = signal<{ algo: Algo; value: string }[]>([]);
  readonly copiedAlgo = signal<string | null>(null);

  constructor() {
    effect(async () => {
      const t = this.text();
      const algos: Algo[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512', 'SHA3-256', 'SHA3-512'];
      const results = await Promise.all(algos.map(async a => ({ algo: a, value: await hash(a, t) })));
      this.rows.set(results);
    });
  }
  onInput(ev: Event) { this.text.set((ev.target as HTMLTextAreaElement).value); }
  async copy(v: string, algo: string) {
    if (await copyToClipboard(v)) {
      this.copiedAlgo.set(algo);
      setTimeout(() => this.copiedAlgo.set(null), 1200);
    }
  }
}
