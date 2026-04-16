import { Component, signal } from '@angular/core';
import { ToolLayoutComponent } from '../tool-layout.component';
import { TOOL_STYLES, copyToClipboard } from '../tool-ui';

@Component({
  selector: 'app-tool-url-encode',
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout title="URL Encode / Decode" subtitle="Percent-encoding for URL-safe strings">
      <div class="card">
        <label>
          Plain text
          <textarea [value]="plain()" (input)="onPlain($event)"
                    placeholder="Type any text"></textarea>
        </label>
        <div class="actions">
          <button class="btn btn-primary" (click)="encode()">Encode →</button>
          <button class="btn" (click)="decode()">← Decode</button>
        </div>
        <label>
          Encoded
          <textarea [value]="encoded()" (input)="onEncoded($event)"
                    placeholder="Encoded output or paste encoded text"></textarea>
        </label>
        <div class="actions">
          <button class="btn" (click)="copyPlain()">{{ copiedPlain() ? 'Copied!' : 'Copy plain' }}</button>
          <button class="btn" (click)="copyEncoded()">{{ copiedEnc() ? 'Copied!' : 'Copy encoded' }}</button>
        </div>
        @if (err()) {
          <p class="error">{{ err() }}</p>
        }
      </div>
    </app-tool-layout>
  `,
  styles: [TOOL_STYLES],
})
export class UrlEncodeComponent {
  readonly plain = signal('hello world & friends');
  readonly encoded = signal('hello%20world%20%26%20friends');
  readonly err = signal('');
  readonly copiedPlain = signal(false);
  readonly copiedEnc = signal(false);

  onPlain(ev: Event) { this.plain.set((ev.target as HTMLTextAreaElement).value); }
  onEncoded(ev: Event) { this.encoded.set((ev.target as HTMLTextAreaElement).value); }
  encode() {
    this.err.set('');
    this.encoded.set(encodeURIComponent(this.plain()));
  }
  decode() {
    try {
      this.plain.set(decodeURIComponent(this.encoded()));
      this.err.set('');
    } catch {
      this.err.set('Malformed URI sequence');
    }
  }
  async copyPlain() {
    if (await copyToClipboard(this.plain())) {
      this.copiedPlain.set(true);
      setTimeout(() => this.copiedPlain.set(false), 1500);
    }
  }
  async copyEncoded() {
    if (await copyToClipboard(this.encoded())) {
      this.copiedEnc.set(true);
      setTimeout(() => this.copiedEnc.set(false), 1500);
    }
  }
}
