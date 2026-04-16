import { Component, signal } from '@angular/core';
import { ToolLayoutComponent } from '../tool-layout.component';
import { TOOL_STYLES, copyToClipboard } from '../tool-ui';

function strToB64(s: string, urlSafe: boolean): string {
  // Encode UTF-8 → base64 correctly (btoa only handles latin-1)
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  const out = btoa(bin);
  return urlSafe ? out.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : out;
}
function b64ToStr(b64: string): string {
  const normalized = b64.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

@Component({
  selector: 'app-tool-base64',
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout title="Base64" subtitle="Encode and decode UTF-8 text to/from Base64">
      <div class="card">
        <label>
          Plain text
          <textarea rows="5" [value]="plain()" (input)="onPlain($event)"></textarea>
        </label>
        <div class="actions">
          <label class="meta" style="flex-direction:row;align-items:center;gap:.5rem">
            <input type="checkbox" [checked]="urlSafe()" (change)="onUrlSafe($event)" />
            URL-safe (no padding)
          </label>
          <button class="btn btn-primary" (click)="encode()">Encode →</button>
          <button class="btn" (click)="decode()">← Decode</button>
        </div>
        <label>
          Base64
          <textarea rows="5" [value]="b64()" (input)="onB64($event)"></textarea>
        </label>
        <div class="actions">
          <button class="btn" (click)="copyPlain()">{{ copiedPlain() ? 'Copied!' : 'Copy plain' }}</button>
          <button class="btn" (click)="copyB64()">{{ copiedB64() ? 'Copied!' : 'Copy base64' }}</button>
        </div>
        @if (err()) {
          <p class="error">{{ err() }}</p>
        }
      </div>
    </app-tool-layout>
  `,
  styles: [TOOL_STYLES],
})
export class Base64Component {
  readonly plain = signal('hello world');
  readonly b64 = signal('aGVsbG8gd29ybGQ=');
  readonly urlSafe = signal(false);
  readonly err = signal('');
  readonly copiedPlain = signal(false);
  readonly copiedB64 = signal(false);

  onPlain(ev: Event) { this.plain.set((ev.target as HTMLTextAreaElement).value); }
  onB64(ev: Event) { this.b64.set((ev.target as HTMLTextAreaElement).value); }
  onUrlSafe(ev: Event) { this.urlSafe.set((ev.target as HTMLInputElement).checked); }
  encode() {
    try {
      this.b64.set(strToB64(this.plain(), this.urlSafe()));
      this.err.set('');
    } catch (e) {
      this.err.set((e as Error).message);
    }
  }
  decode() {
    try {
      this.plain.set(b64ToStr(this.b64()));
      this.err.set('');
    } catch (e) {
      this.err.set('Invalid Base64: ' + (e as Error).message);
    }
  }
  async copyPlain() {
    if (await copyToClipboard(this.plain())) {
      this.copiedPlain.set(true);
      setTimeout(() => this.copiedPlain.set(false), 1500);
    }
  }
  async copyB64() {
    if (await copyToClipboard(this.b64())) {
      this.copiedB64.set(true);
      setTimeout(() => this.copiedB64.set(false), 1500);
    }
  }
}
