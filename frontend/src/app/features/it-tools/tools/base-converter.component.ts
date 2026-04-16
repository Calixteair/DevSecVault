import { Component, signal } from '@angular/core';
import { ToolLayoutComponent } from '../tool-layout.component';
import { TOOL_STYLES } from '../tool-ui';

type BaseKey = 'bin' | 'oct' | 'dec' | 'hex';
const RADIX: Record<BaseKey, number> = { bin: 2, oct: 8, dec: 10, hex: 16 };

@Component({
  selector: 'app-tool-base-converter',
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout title="Base Converter" subtitle="Convert integers between binary, octal, decimal and hexadecimal">
      <div class="card">
        <label>
          Binary (base 2)
          <input type="text" [value]="values().bin" (input)="onChange('bin', $event)" />
        </label>
        <label>
          Octal (base 8)
          <input type="text" [value]="values().oct" (input)="onChange('oct', $event)" />
        </label>
        <label>
          Decimal (base 10)
          <input type="text" [value]="values().dec" (input)="onChange('dec', $event)" />
        </label>
        <label>
          Hexadecimal (base 16)
          <input type="text" [value]="values().hex" (input)="onChange('hex', $event)" />
        </label>
        <label>
          Custom base (2-36)
          <div class="row">
            <input type="number" min="2" max="36" [value]="customBase()" (input)="onBase($event)" />
            <input type="text" [value]="values().custom" (input)="onChange('custom', $event)" />
          </div>
        </label>
        @if (err()) {
          <p class="error">{{ err() }}</p>
        }
      </div>
    </app-tool-layout>
  `,
  styles: [TOOL_STYLES],
})
export class BaseConverterComponent {
  readonly values = signal({ bin: '1010', oct: '12', dec: '10', hex: 'A', custom: '10' });
  readonly customBase = signal(10);
  readonly err = signal('');

  onChange(key: BaseKey | 'custom', ev: Event) {
    const raw = (ev.target as HTMLInputElement).value.trim();
    const radix = key === 'custom' ? this.customBase() : RADIX[key];
    if (!raw) {
      this.values.set({ bin: '', oct: '', dec: '', hex: '', custom: '' });
      this.err.set('');
      return;
    }
    const valid = this.validChars(radix);
    if (!valid.test(raw)) { this.err.set(`Invalid characters for base ${radix}`); return; }
    const n = parseInt(raw, radix);
    if (!Number.isFinite(n)) { this.err.set('Cannot parse value'); return; }
    this.err.set('');
    this.values.set({
      bin: n.toString(2),
      oct: n.toString(8),
      dec: n.toString(10),
      hex: n.toString(16).toUpperCase(),
      custom: n.toString(this.customBase()),
    });
  }
  onBase(ev: Event) {
    const b = Number((ev.target as HTMLInputElement).value);
    if (b >= 2 && b <= 36) {
      this.customBase.set(b);
      const n = parseInt(this.values().dec, 10);
      if (Number.isFinite(n)) {
        this.values.set({ ...this.values(), custom: n.toString(b) });
      }
    }
  }
  private validChars(radix: number): RegExp {
    const digits = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, radix);
    return new RegExp(`^-?[${digits}]+$`, 'i');
  }
}
