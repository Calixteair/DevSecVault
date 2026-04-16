import { Component, computed, signal } from '@angular/core';
import { ToolLayoutComponent } from '../tool-layout.component';
import { TOOL_STYLES, copyToClipboard } from '../tool-ui';

interface SubnetInfo {
  networkAddress: string;
  broadcastAddress: string;
  firstHost: string;
  lastHost: string;
  hostCount: number;
  netmask: string;
  wildcard: string;
  cidr: number;
  binaryMask: string;
}

function parseIpv4(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    const byte = Number(part);
    if (!Number.isInteger(byte) || byte < 0 || byte > 255 || part === '') return null;
    n = (n << 8) | byte;
  }
  return n >>> 0;
}

function ipv4ToString(n: number): string {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff].join('.');
}

function calcSubnet(ip: string, cidr: number): SubnetInfo | null {
  const addr = parseIpv4(ip);
  if (addr === null || cidr < 0 || cidr > 32) return null;
  const mask = cidr === 0 ? 0 : ((0xffffffff << (32 - cidr)) >>> 0);
  const wildcard = (~mask) >>> 0;
  const network = (addr & mask) >>> 0;
  const broadcast = (network | wildcard) >>> 0;
  const totalHosts = cidr >= 31 ? (cidr === 32 ? 1 : 2) : Math.max(0, 2 ** (32 - cidr) - 2);
  const firstHost = cidr >= 31 ? network : (network + 1) >>> 0;
  const lastHost = cidr >= 31 ? broadcast : (broadcast - 1) >>> 0;
  const binaryMask = [...Array(4)].map((_, i) =>
    ((mask >>> ((3 - i) * 8)) & 0xff).toString(2).padStart(8, '0'),
  ).join('.');
  return {
    networkAddress: ipv4ToString(network),
    broadcastAddress: ipv4ToString(broadcast),
    firstHost: ipv4ToString(firstHost),
    lastHost: ipv4ToString(lastHost),
    hostCount: totalHosts,
    netmask: ipv4ToString(mask),
    wildcard: ipv4ToString(wildcard),
    cidr,
    binaryMask,
  };
}

@Component({
  selector: 'app-tool-subnet',
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout title="Subnet Calculator" subtitle="IPv4 CIDR, netmask, broadcast and host ranges">
      <div class="card">
        <div class="row">
          <label>
            IP Address
            <input type="text" placeholder="192.168.1.10" [value]="ip()" (input)="onIp($event)" />
          </label>
          <label>
            CIDR
            <input type="number" min="0" max="32" [value]="cidr()" (input)="onCidr($event)" />
          </label>
        </div>
        @if (result() === null) {
          <p class="error">Invalid IPv4 address or CIDR.</p>
        }
      </div>

      @if (result(); as r) {
        <div class="card">
          <dl class="kv">
            <dt>Network</dt><dd>{{ r.networkAddress }}/{{ r.cidr }}</dd>
            <dt>Netmask</dt><dd>{{ r.netmask }}</dd>
            <dt>Wildcard</dt><dd>{{ r.wildcard }}</dd>
            <dt>Binary mask</dt><dd>{{ r.binaryMask }}</dd>
            <dt>Broadcast</dt><dd>{{ r.broadcastAddress }}</dd>
            <dt>First host</dt><dd>{{ r.firstHost }}</dd>
            <dt>Last host</dt><dd>{{ r.lastHost }}</dd>
            <dt>Usable hosts</dt><dd>{{ r.hostCount.toLocaleString() }}</dd>
          </dl>
          <div class="actions">
            <button class="btn" (click)="copy(summary(r))">{{ copied() ? 'Copied!' : 'Copy all' }}</button>
          </div>
        </div>
      }
    </app-tool-layout>
  `,
  styles: [TOOL_STYLES],
})
export class SubnetComponent {
  readonly ip = signal('192.168.1.10');
  readonly cidr = signal(24);
  readonly copied = signal(false);
  readonly result = computed(() => calcSubnet(this.ip(), this.cidr()));

  onIp(ev: Event) { this.ip.set((ev.target as HTMLInputElement).value); }
  onCidr(ev: Event) {
    const v = Number((ev.target as HTMLInputElement).value);
    if (Number.isFinite(v)) this.cidr.set(v);
  }
  summary(r: SubnetInfo): string {
    return `Network: ${r.networkAddress}/${r.cidr}
Netmask: ${r.netmask}
Wildcard: ${r.wildcard}
Broadcast: ${r.broadcastAddress}
First host: ${r.firstHost}
Last host: ${r.lastHost}
Usable hosts: ${r.hostCount}`;
  }
  async copy(text: string) {
    const ok = await copyToClipboard(text);
    if (ok) {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    }
  }
}
