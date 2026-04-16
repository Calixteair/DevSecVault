import { Component, signal } from '@angular/core';
import { ToolLayoutComponent } from '../tool-layout.component';
import { TOOL_STYLES, copyToClipboard } from '../tool-ui';

function uuidV4(): string {
  return crypto.randomUUID();
}
// UUID v7: time-ordered, based on unix_ts_ms + random. Implementation of RFC 9562.
function uuidV7(): string {
  const ts = BigInt(Date.now());
  const rand = new Uint8Array(10);
  crypto.getRandomValues(rand);
  // 48 bits timestamp
  const tsHex = ts.toString(16).padStart(12, '0');
  // Set version (7) in byte 6 and variant (10xx) in byte 8
  rand[0] = (rand[0] & 0x0f) | 0x70;
  rand[2] = (rand[2] & 0x3f) | 0x80;
  const randHex = Array.from(rand).map(b => b.toString(16).padStart(2, '0')).join('');
  // Format: ttttttttttttxxxxxxxxxxxxxxxxxxxx
  const joined = tsHex + randHex;
  return `${joined.slice(0, 8)}-${joined.slice(8, 12)}-${joined.slice(12, 16)}-${joined.slice(16, 20)}-${joined.slice(20, 32)}`;
}

@Component({
  selector: 'app-tool-uuid',
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout title="UUID Generator" subtitle="Generate UUID v4 (random) or v7 (time-ordered)">
      <div class="card">
        <div class="row">
          <label>
            Version
            <select [value]="version()" (change)="onVersion($event)">
              <option value="4">v4 (random)</option>
              <option value="7">v7 (time-ordered)</option>
            </select>
          </label>
          <label>
            Quantity
            <input type="number" min="1" max="100" [value]="qty()" (input)="onQty($event)" />
          </label>
        </div>
        <div class="actions">
          <button class="btn btn-primary" (click)="generate()">Generate</button>
          <button class="btn" (click)="copyAll()">{{ copied() ? 'Copied!' : 'Copy all' }}</button>
        </div>
        <label>
          UUIDs
          <textarea rows="8" [value]="output()" readonly></textarea>
        </label>
      </div>
    </app-tool-layout>
  `,
  styles: [TOOL_STYLES],
})
export class UuidComponent {
  readonly version = signal<'4' | '7'>('4');
  readonly qty = signal(5);
  readonly output = signal('');
  readonly copied = signal(false);

  constructor() { this.generate(); }

  onVersion(ev: Event) { this.version.set((ev.target as HTMLSelectElement).value as '4' | '7'); this.generate(); }
  onQty(ev: Event) {
    const v = Number((ev.target as HTMLInputElement).value);
    if (v >= 1 && v <= 100) { this.qty.set(v); this.generate(); }
  }
  generate() {
    const gen = this.version() === '4' ? uuidV4 : uuidV7;
    this.output.set(Array.from({ length: this.qty() }, gen).join('\n'));
  }
  async copyAll() {
    if (await copyToClipboard(this.output())) {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    }
  }
}
