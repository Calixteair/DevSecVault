import { Component, computed, signal } from '@angular/core';
import { ToolLayoutComponent } from '../tool-layout.component';
import { TOOL_STYLES } from '../tool-ui';

/**
 * Tiny embedded OUI dataset. We intentionally ship only the most common
 * prefixes to keep the bundle small — users who need exhaustive lookup
 * should use a dedicated CLI. Extend as needed.
 */
const OUI_DB: Record<string, string> = {
  '000C29': 'VMware, Inc.',
  '005056': 'VMware, Inc.',
  '001C42': 'Parallels, Inc.',
  '080027': 'PCS Systemtechnik (VirtualBox)',
  '525400': 'QEMU / KVM',
  '001A11': 'Google, Inc.',
  '3C5AB4': 'Google, Inc.',
  'F4F5E8': 'Google, Inc.',
  '001DD8': 'Microsoft Corporation',
  '0017FA': 'Microsoft Corporation',
  '7C1E52': 'Microsoft Corporation',
  '001124': 'Apple, Inc.',
  '3C0754': 'Apple, Inc.',
  '88E9FE': 'Apple, Inc.',
  'F0DBF8': 'Apple, Inc.',
  'A4C361': 'Apple, Inc.',
  'B8E856': 'Apple, Inc.',
  '001B63': 'Apple, Inc.',
  '001EC2': 'Apple, Inc.',
  '0023DF': 'Apple, Inc.',
  'FCFC48': 'Apple, Inc.',
  '001320': 'Intel Corporate',
  '001E67': 'Intel Corporate',
  'F8E43B': 'Intel Corporate',
  '94C691': 'Intel Corporate',
  '3C970E': 'Wistron InfoComm',
  '001B21': 'Samsung Electronics',
  'E8508B': 'Samsung Electronics',
  '002248': 'Microsoft Corporation',
  '78D004': 'Nintendo Co., Ltd.',
  '040CCE': 'Sony Corporation',
  '001320AB': 'Cisco Systems',
  '00000C': 'Cisco Systems, Inc.',
  '001E14': 'Cisco Systems, Inc.',
  '0019AA': 'Cisco Systems, Inc.',
  'E8BA70': 'Cisco Systems, Inc.',
  '001E58': 'D-Link Corporation',
  '001B11': 'D-Link Corporation',
  '001BFC': 'ASUSTek COMPUTER INC.',
  'D850E6': 'ASUSTek COMPUTER INC.',
  'D4CA6D': 'Routerboard.com / MikroTik',
  'B827EB': 'Raspberry Pi Foundation',
  'DCA632': 'Raspberry Pi Trading Ltd',
  'E45F01': 'Raspberry Pi Trading Ltd',
  '001018': 'Broadcom Corporation',
  '0000F0': 'Samsung Electronics',
  '001E4C': 'Hewlett Packard',
  '001F29': 'Hewlett Packard',
  'C4346B': 'Hewlett Packard',
  'FCFF5C': 'Hon Hai / Foxconn',
  '5C260A': 'Dell Inc.',
  '0022B0': 'Dell Inc.',
  '001A4B': 'Hewlett Packard',
};

function normalizeMac(input: string): string | null {
  const cleaned = input.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  if (cleaned.length < 6) return null;
  return cleaned.slice(0, 12).padEnd(12, '0');
}

@Component({
  selector: 'app-tool-mac-lookup',
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout title="MAC Address Lookup" subtitle="Resolve vendor from a MAC/OUI prefix (embedded dataset)">
      <div class="card">
        <label>
          MAC address or OUI prefix
          <input type="text" placeholder="B8:27:EB:12:34:56" [value]="input()" (input)="onInput($event)" />
        </label>
        @if (result(); as r) {
          <dl class="kv">
            <dt>Input</dt><dd>{{ r.mac }}</dd>
            <dt>OUI (first 3 bytes)</dt><dd>{{ r.oui }}</dd>
            <dt>Vendor</dt>
            <dd>{{ r.vendor ?? 'Not found in embedded dataset' }}</dd>
            <dt>Type</dt>
            <dd>{{ r.cast }} / {{ r.admin }}</dd>
          </dl>
        } @else {
          <p class="meta">Enter at least the first 3 bytes (6 hex chars).</p>
        }
      </div>
      <div class="card">
        <p class="meta">
          The embedded database covers the most common vendors only. For exhaustive lookup,
          grep the IEEE OUI registry (<code>oui.txt</code>) or use <code>arp</code>/<code>nmap</code>.
        </p>
      </div>
    </app-tool-layout>
  `,
  styles: [TOOL_STYLES],
})
export class MacLookupComponent {
  readonly input = signal('B8:27:EB:12:34:56');

  readonly result = computed(() => {
    const raw = this.input();
    const norm = normalizeMac(raw);
    if (!norm) return null;
    const oui = norm.slice(0, 6);
    const vendor: string | undefined = Object.prototype.hasOwnProperty.call(OUI_DB, oui) ? OUI_DB[oui] : undefined;
    const firstByte = parseInt(norm.slice(0, 2), 16);
    const cast = (firstByte & 1) ? 'Multicast' : 'Unicast';
    const admin = (firstByte & 2) ? 'Locally administered' : 'Universally administered';
    return {
      mac: norm.match(/.{1,2}/g)!.join(':'),
      oui: oui.match(/.{1,2}/g)!.join(':'),
      vendor,
      cast,
      admin,
    };
  });

  onInput(ev: Event) { this.input.set((ev.target as HTMLInputElement).value); }
}
