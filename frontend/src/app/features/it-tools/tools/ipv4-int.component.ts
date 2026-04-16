import { Component, signal } from '@angular/core';
import { ToolLayoutComponent } from '../tool-layout.component';
import { TOOL_STYLES, copyToClipboard } from '../tool-ui';

function ipToInt(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const b = Number(p);
    if (!Number.isInteger(b) || b < 0 || b > 255 || p === '') return null;
    n = (n << 8) | b;
  }
  return n >>> 0;
}
function intToIp(n: number): string {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff].join('.');
}

@Component({
  selector: 'app-tool-ipv4-int',
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout title="IPv4 ↔ Integer" subtitle="Convert between dotted-quad and 32-bit representations">
      <div class="card">
        <label>
          IPv4 address
          <input type="text" placeholder="192.168.1.1" [value]="ip()" (input)="onIp($event)" />
        </label>
        <label>
          Integer (unsigned 32-bit)
          <input type="text" placeholder="3232235777" [value]="intStr()" (input)="onInt($event)" />
        </label>
        <label>
          Hexadecimal
          <input type="text" [value]="hex()" readonly />
        </label>
        <label>
          Binary
          <input type="text" [value]="bin()" readonly />
        </label>
        @if (err()) {
          <p class="error">{{ err() }}</p>
        }
      </div>
    </app-tool-layout>
  `,
  styles: [TOOL_STYLES],
})
export class Ipv4IntComponent {
  readonly ip = signal('192.168.1.1');
  readonly intStr = signal('3232235777');
  readonly hex = signal('0xC0A80101');
  readonly bin = signal('11000000.10101000.00000001.00000001');
  readonly err = signal('');

  private recomputeFromInt(n: number) {
    this.ip.set(intToIp(n));
    this.intStr.set(String(n));
    this.hex.set('0x' + n.toString(16).toUpperCase().padStart(8, '0'));
    this.bin.set([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]
      .map(b => b.toString(2).padStart(8, '0')).join('.'));
  }

  onIp(ev: Event) {
    const v = (ev.target as HTMLInputElement).value;
    const n = ipToInt(v);
    this.ip.set(v);
    if (n === null) { this.err.set('Invalid IPv4 address'); return; }
    this.err.set('');
    this.recomputeFromInt(n);
    this.ip.set(v); // preserve user typing
  }
  onInt(ev: Event) {
    const raw = (ev.target as HTMLInputElement).value.trim();
    const n = Number(raw);
    this.intStr.set(raw);
    if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) { this.err.set('Must be 0 to 4294967295'); return; }
    this.err.set('');
    this.recomputeFromInt(n);
    this.intStr.set(raw);
  }
}
