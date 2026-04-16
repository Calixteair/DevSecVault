import { Component, signal } from '@angular/core';
import { ToolLayoutComponent } from '../tool-layout.component';
import { TOOL_STYLES, copyToClipboard } from '../tool-ui';

@Component({
  selector: 'app-tool-json-formatter',
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout title="JSON Formatter" subtitle="Validate, pretty-print or minify JSON">
      <div class="card">
        <label>
          Input
          <textarea rows="8" [value]="input()" (input)="onInput($event)" placeholder='{"key":"value"}'></textarea>
        </label>
        <div class="actions">
          <label class="meta" style="flex-direction:row;align-items:center;gap:.5rem">
            Indent
            <select [value]="indent()" (change)="onIndent($event)">
              <option value="2">2 spaces</option>
              <option value="4">4 spaces</option>
              <option value="tab">Tab</option>
            </select>
          </label>
          <button class="btn btn-primary" (click)="pretty()">Pretty print</button>
          <button class="btn" (click)="minify()">Minify</button>
        </div>
        @if (err()) {
          <p class="error">{{ err() }}</p>
        }
      </div>
      <div class="card">
        <label>
          Output
          <textarea rows="10" [value]="output()" readonly></textarea>
        </label>
        <div class="actions">
          <button class="btn" (click)="copy()">{{ copied() ? 'Copied!' : 'Copy output' }}</button>
        </div>
      </div>
    </app-tool-layout>
  `,
  styles: [TOOL_STYLES],
})
export class JsonFormatterComponent {
  readonly input = signal('{"hello":"world","array":[1,2,3],"nested":{"a":true}}');
  readonly output = signal('');
  readonly err = signal('');
  readonly indent = signal<'2' | '4' | 'tab'>('2');
  readonly copied = signal(false);

  onInput(ev: Event) { this.input.set((ev.target as HTMLTextAreaElement).value); }
  onIndent(ev: Event) { this.indent.set((ev.target as HTMLSelectElement).value as '2' | '4' | 'tab'); }

  pretty() {
    try {
      const parsed = JSON.parse(this.input());
      const ind = this.indent() === 'tab' ? '\t' : Number(this.indent());
      this.output.set(JSON.stringify(parsed, null, ind));
      this.err.set('');
    } catch (e: unknown) {
      this.err.set((e as Error).message);
    }
  }
  minify() {
    try {
      this.output.set(JSON.stringify(JSON.parse(this.input())));
      this.err.set('');
    } catch (e: unknown) {
      this.err.set((e as Error).message);
    }
  }
  async copy() {
    if (await copyToClipboard(this.output())) {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    }
  }
}
