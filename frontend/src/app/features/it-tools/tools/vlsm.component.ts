import { Component, computed, signal } from '@angular/core';
import { ToolLayoutComponent } from '../tool-layout.component';
import { TOOL_STYLES, copyToClipboard } from '../tool-ui';

/**
 * VLSM Calculator — Variable Length Subnet Masking.
 *
 * Classic first-fit-decreasing allocation: requirements are sorted by host
 * count descending, then each gets the smallest CIDR block that fits
 * (hosts + network + broadcast), carved contiguously from the base network.
 * Sorting descending is what keeps the plan free of alignment holes: a block
 * of size 2^n is always allocated on a 2^n boundary.
 */

interface SubnetRequest {
  /** Display name of the subnet */
  name: string;
  /** Number of usable hosts required */
  hosts: number;
}

interface AllocatedSubnet {
  name: string;
  requestedHosts: number;
  cidr: number;
  netmask: string;
  wildcard: string;
  network: string;
  firstHost: string;
  lastHost: string;
  broadcast: string;
  usableHosts: number;
  /** Usable addresses left over after satisfying the request */
  wasted: number;
}

interface VlsmPlan {
  subnets: AllocatedSubnet[];
  baseNetwork: string;
  baseCidr: number;
  totalAddresses: number;
  usedAddresses: number;
  /** First free address after the last allocated block, null if the space is full */
  nextFree: string | null;
  remainingAddresses: number;
}

type VlsmResult =
  | { ok: true; plan: VlsmPlan }
  | { ok: false; error: string };

function parseIpv4(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    const byte = Number(part);
    if (!Number.isInteger(byte) || byte < 0 || byte > 255 || part === '') return null;
    n = (n * 256) + byte;
  }
  return n >>> 0;
}

function ipv4ToString(n: number): string {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff].join('.');
}

function maskFor(cidr: number): number {
  return cidr === 0 ? 0 : ((0xffffffff << (32 - cidr)) >>> 0);
}

/** Smallest CIDR whose block holds `hosts` usable addresses (+ network + broadcast). */
function cidrForHosts(hosts: number): number | null {
  const needed = hosts + 2;
  for (let cidr = 30; cidr >= 0; cidr--) {
    if (2 ** (32 - cidr) >= needed) return cidr;
  }
  return null;
}

function allocate(baseIp: string, baseCidr: number, requests: SubnetRequest[]): VlsmResult {
  const addr = parseIpv4(baseIp);
  if (addr === null) return { ok: false, error: 'Invalid IPv4 base address.' };
  if (!Number.isInteger(baseCidr) || baseCidr < 0 || baseCidr > 30) {
    return { ok: false, error: 'Base CIDR must be between /0 and /30.' };
  }
  if (requests.length === 0) return { ok: false, error: 'Add at least one subnet requirement.' };

  const baseMask = maskFor(baseCidr);
  const baseNetwork = (addr & baseMask) >>> 0;
  const totalAddresses = 2 ** (32 - baseCidr);
  const baseEnd = baseNetwork + totalAddresses; // exclusive

  // First-fit-decreasing: largest block first keeps every allocation aligned.
  const sorted = [...requests]
    .map((r, i) => ({ ...r, order: i }))
    .sort((a, b) => b.hosts - a.hosts || a.order - b.order);

  const subnets: AllocatedSubnet[] = [];
  let cursor = baseNetwork;

  for (const req of sorted) {
    if (!Number.isInteger(req.hosts) || req.hosts < 1) {
      return { ok: false, error: `"${req.name}" must require at least 1 host.` };
    }
    const cidr = cidrForHosts(req.hosts);
    if (cidr === null) {
      return { ok: false, error: `"${req.name}" requires more hosts than IPv4 can address.` };
    }
    const size = 2 ** (32 - cidr);
    if (cursor + size > baseEnd) {
      const short = req.hosts;
      return {
        ok: false,
        error: `Not enough address space: "${req.name}" needs a /${cidr} (${short} hosts) but the ${ipv4ToString(baseNetwork)}/${baseCidr} block is exhausted. Widen the base network.`,
      };
    }
    const mask = maskFor(cidr);
    const broadcast = (cursor + size - 1) >>> 0;
    const usableHosts = size - 2;
    subnets.push({
      name: req.name,
      requestedHosts: req.hosts,
      cidr,
      netmask: ipv4ToString(mask),
      wildcard: ipv4ToString((~mask) >>> 0),
      network: ipv4ToString(cursor),
      firstHost: ipv4ToString((cursor + 1) >>> 0),
      lastHost: ipv4ToString((broadcast - 1) >>> 0),
      broadcast: ipv4ToString(broadcast),
      usableHosts,
      wasted: usableHosts - req.hosts,
    });
    cursor += size;
  }

  const usedAddresses = cursor - baseNetwork;
  return {
    ok: true,
    plan: {
      subnets,
      baseNetwork: ipv4ToString(baseNetwork),
      baseCidr,
      totalAddresses,
      usedAddresses,
      nextFree: cursor < baseEnd ? ipv4ToString(cursor) : null,
      remainingAddresses: totalAddresses - usedAddresses,
    },
  };
}

/** One row of the requirements editor. */
interface RequirementRow {
  id: number;
  name: string;
  hosts: number;
}

@Component({
  selector: 'app-tool-vlsm',
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout
      title="VLSM Calculator"
      subtitle="Carve a network into variable-length subnets — give a base address, a mask and your host requirements">

      <div class="card">
        <h3 class="card-title">Base network</h3>
        <div class="row">
          <label>
            IP Address
            <input type="text" placeholder="192.168.1.0" [value]="baseIp()" (input)="onBaseIp($event)" />
          </label>
          <label>
            CIDR / Mask
            <select [value]="baseCidr()" (change)="onBaseCidr($event)">
              @for (c of cidrChoices; track c) {
                <option [value]="c">/{{ c }} — {{ maskLabel(c) }}</option>
              }
            </select>
          </label>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">Quick fill</h3>
        <p class="meta">Generate N identical subnets, then tweak any row below.</p>
        <div class="row">
          <label>
            Number of subnets
            <input type="number" min="1" max="256" [value]="bulkCount()" (input)="onBulkCount($event)" />
          </label>
          <label>
            Hosts per subnet
            <input type="number" min="1" [value]="bulkHosts()" (input)="onBulkHosts($event)" />
          </label>
        </div>
        <div class="actions">
          <button class="btn btn-primary" (click)="applyBulk()">Generate</button>
          <button class="btn" (click)="addRow()">Add one subnet</button>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">Requirements ({{ rows().length }})</h3>
        @if (rows().length === 0) {
          <p class="meta">No subnet yet — use "Generate" or "Add one subnet".</p>
        }
        @for (row of rows(); track row.id) {
          <div class="req-row">
            <input
              type="text"
              class="req-name"
              placeholder="Subnet name"
              [value]="row.name"
              (input)="onRowName(row.id, $event)" />
            <input
              type="number"
              class="req-hosts"
              min="1"
              placeholder="Hosts"
              [value]="row.hosts"
              (input)="onRowHosts(row.id, $event)" />
            <span class="req-hint">{{ hintFor(row.hosts) }}</span>
            <button class="btn btn-remove" (click)="removeRow(row.id)" title="Remove">×</button>
          </div>
        }
        @if (rows().length > 0) {
          <div class="actions">
            <button class="btn" (click)="clearRows()">Clear all</button>
          </div>
        }
      </div>

      @if (result(); as res) {
        @if (!res.ok) {
          <p class="error">{{ res.error }}</p>
        } @else {
          <div class="card">
            <h3 class="card-title">Allocation plan</h3>
            <div class="table-scroll">
              <table class="vlsm-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Needed</th>
                    <th>Network</th>
                    <th>Mask</th>
                    <th>Wildcard</th>
                    <th>First host</th>
                    <th>Last host</th>
                    <th>Broadcast</th>
                    <th>Usable</th>
                    <th>Free</th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of res.plan.subnets; track $index; let i = $index) {
                    <tr>
                      <td class="num">{{ i + 1 }}</td>
                      <td class="name">{{ s.name }}</td>
                      <td class="num">{{ s.requestedHosts }}</td>
                      <td class="net">{{ s.network }}/{{ s.cidr }}</td>
                      <td>{{ s.netmask }}</td>
                      <td>{{ s.wildcard }}</td>
                      <td>{{ s.firstHost }}</td>
                      <td>{{ s.lastHost }}</td>
                      <td>{{ s.broadcast }}</td>
                      <td class="num">{{ s.usableHosts }}</td>
                      <td class="num" [class.waste]="s.wasted > s.requestedHosts">{{ s.wasted }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <h3 class="card-title">Summary</h3>
            <dl class="kv">
              <dt>Base network</dt><dd>{{ res.plan.baseNetwork }}/{{ res.plan.baseCidr }}</dd>
              <dt>Total addresses</dt><dd>{{ res.plan.totalAddresses.toLocaleString() }}</dd>
              <dt>Allocated</dt>
              <dd>{{ res.plan.usedAddresses.toLocaleString() }} ({{ usagePct(res.plan) }}%)</dd>
              <dt>Remaining</dt><dd>{{ res.plan.remainingAddresses.toLocaleString() }}</dd>
              <dt>Next free address</dt>
              <dd>{{ res.plan.nextFree ?? 'none — block is full' }}</dd>
            </dl>
            <div class="usage-bar" [attr.aria-label]="'Address space usage ' + usagePct(res.plan) + '%'">
              <div class="usage-fill" [style.width.%]="usagePct(res.plan)"></div>
            </div>
            <div class="actions">
              <button class="btn" (click)="copy(asText(res.plan))">
                {{ copied() === 'text' ? 'Copied!' : 'Copy table' }}
              </button>
              <button class="btn" (click)="copy(asCsv(res.plan), 'csv')">
                {{ copied() === 'csv' ? 'Copied!' : 'Copy CSV' }}
              </button>
            </div>
          </div>
        }
      }
    </app-tool-layout>
  `,
  styles: [TOOL_STYLES, `
    .req-row {
      display: grid;
      grid-template-columns: minmax(6rem, 1fr) 7rem minmax(5rem, auto) 2.25rem;
      gap: 0.5rem;
      align-items: center;
    }
    .req-hint {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.6875rem;
      letter-spacing: 0.04em;
      color: var(--muted-foreground);
      white-space: nowrap;
    }
    .btn-remove {
      width: 2.25rem;
      padding: 0;
      font-size: 1rem;
      line-height: 1;
    }
    .btn-remove:hover {
      color: var(--destructive);
      border-color: var(--destructive);
    }

    .table-scroll {
      overflow-x: auto;
      margin: 0 -0.25rem;
      padding: 0 0.25rem;
    }
    .vlsm-table {
      width: 100%;
      border-collapse: collapse;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      white-space: nowrap;
    }
    .vlsm-table th {
      text-align: left;
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted-foreground);
      padding: 0.5rem 0.625rem;
      border-bottom: 1px solid var(--border);
    }
    .vlsm-table td {
      padding: 0.5rem 0.625rem;
      border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
      color: var(--foreground);
    }
    .vlsm-table tbody tr:last-child td { border-bottom: none; }
    .vlsm-table tbody tr:hover td {
      background: color-mix(in srgb, var(--secondary) 45%, transparent);
    }
    .vlsm-table .num { text-align: right; }
    .vlsm-table .name { color: var(--foreground); font-weight: 500; }
    .vlsm-table .net { color: var(--primary); font-weight: 600; }
    .vlsm-table .waste { color: var(--destructive); }

    .usage-bar {
      height: 0.5rem;
      background: color-mix(in srgb, var(--secondary) 70%, transparent);
      border: 1px solid var(--border);
      border-radius: 999px;
      overflow: hidden;
    }
    .usage-fill {
      height: 100%;
      background: var(--primary);
      transition: width 0.2s ease;
    }

    @media (max-width: 560px) {
      .req-row {
        grid-template-columns: 1fr 5.5rem 2.25rem;
        grid-template-areas:
          "name hosts remove"
          "hint hint hint";
      }
      .req-name { grid-area: name; }
      .req-hosts { grid-area: hosts; }
      .btn-remove { grid-area: remove; width: 2.25rem; }
      .req-hint { grid-area: hint; }
      .vlsm-table { font-size: 0.6875rem; }
      .vlsm-table th, .vlsm-table td { padding: 0.375rem 0.5rem; }
    }
  `],
})
export class VlsmComponent {
  readonly cidrChoices = Array.from({ length: 25 }, (_, i) => i + 6); // /6 … /30

  readonly baseIp = signal('192.168.1.0');
  readonly baseCidr = signal(24);
  readonly bulkCount = signal(4);
  readonly bulkHosts = signal(25);
  readonly rows = signal<RequirementRow[]>([
    { id: 1, name: 'LAN-1', hosts: 50 },
    { id: 2, name: 'LAN-2', hosts: 25 },
    { id: 3, name: 'LAN-3', hosts: 10 },
    { id: 4, name: 'WAN-Link', hosts: 2 },
  ]);
  readonly copied = signal<'text' | 'csv' | null>(null);

  private nextId = 5;

  readonly result = computed<VlsmResult>(() =>
    allocate(this.baseIp(), this.baseCidr(), this.rows().map(r => ({ name: r.name || 'unnamed', hosts: r.hosts }))),
  );

  maskLabel(cidr: number): string {
    return ipv4ToString(maskFor(cidr));
  }

  /** Inline preview of the block a row will consume. */
  hintFor(hosts: number): string {
    if (!Number.isInteger(hosts) || hosts < 1) return '—';
    const cidr = cidrForHosts(hosts);
    if (cidr === null) return 'too large';
    return `→ /${cidr} (${2 ** (32 - cidr) - 2} usable)`;
  }

  usagePct(plan: VlsmPlan): number {
    return Math.round((plan.usedAddresses / plan.totalAddresses) * 1000) / 10;
  }

  onBaseIp(ev: Event) { this.baseIp.set((ev.target as HTMLInputElement).value); }

  onBaseCidr(ev: Event) {
    this.baseCidr.set(Number((ev.target as HTMLSelectElement).value));
  }

  onBulkCount(ev: Event) { this.bulkCount.set(this.intFrom(ev, 1)); }
  onBulkHosts(ev: Event) { this.bulkHosts.set(this.intFrom(ev, 1)); }

  applyBulk() {
    const count = Math.min(Math.max(this.bulkCount(), 1), 256);
    const hosts = Math.max(this.bulkHosts(), 1);
    this.rows.set(
      Array.from({ length: count }, (_, i) => ({
        id: this.nextId++,
        name: `Subnet-${i + 1}`,
        hosts,
      })),
    );
  }

  addRow() {
    this.rows.update(rows => [
      ...rows,
      { id: this.nextId++, name: `Subnet-${rows.length + 1}`, hosts: this.bulkHosts() },
    ]);
  }

  removeRow(id: number) {
    this.rows.update(rows => rows.filter(r => r.id !== id));
  }

  clearRows() { this.rows.set([]); }

  onRowName(id: number, ev: Event) {
    const name = (ev.target as HTMLInputElement).value;
    this.rows.update(rows => rows.map(r => (r.id === id ? { ...r, name } : r)));
  }

  onRowHosts(id: number, ev: Event) {
    const hosts = this.intFrom(ev, 1);
    this.rows.update(rows => rows.map(r => (r.id === id ? { ...r, hosts } : r)));
  }

  private intFrom(ev: Event, min: number): number {
    const v = Number((ev.target as HTMLInputElement).value);
    return Number.isFinite(v) ? Math.max(Math.trunc(v), min) : min;
  }

  asText(plan: VlsmPlan): string {
    const header = ['#', 'Name', 'Needed', 'Network', 'Mask', 'First host', 'Last host', 'Broadcast', 'Usable'];
    const rows = plan.subnets.map((s, i) => [
      String(i + 1), s.name, String(s.requestedHosts), `${s.network}/${s.cidr}`,
      s.netmask, s.firstHost, s.lastHost, s.broadcast, String(s.usableHosts),
    ]);
    const widths = header.map((h, i) => Math.max(h.length, ...rows.map(r => r[i].length)));
    const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd();
    return [
      `VLSM plan for ${plan.baseNetwork}/${plan.baseCidr}`,
      '',
      line(header),
      widths.map(w => '-'.repeat(w)).join('  '),
      ...rows.map(line),
      '',
      `Allocated: ${plan.usedAddresses} / ${plan.totalAddresses} addresses`,
      `Next free: ${plan.nextFree ?? 'none'}`,
    ].join('\n');
  }

  asCsv(plan: VlsmPlan): string {
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const header = 'name,requested_hosts,network,cidr,netmask,wildcard,first_host,last_host,broadcast,usable_hosts,free_hosts';
    const lines = plan.subnets.map(s => [
      esc(s.name), s.requestedHosts, s.network, s.cidr, s.netmask, s.wildcard,
      s.firstHost, s.lastHost, s.broadcast, s.usableHosts, s.wasted,
    ].join(','));
    return [header, ...lines].join('\n');
  }

  async copy(text: string, kind: 'text' | 'csv' = 'text') {
    if (await copyToClipboard(text)) {
      this.copied.set(kind);
      setTimeout(() => this.copied.set(null), 1500);
    }
  }
}
