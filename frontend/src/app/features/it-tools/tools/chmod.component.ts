import { Component, computed, signal } from '@angular/core';
import { ToolLayoutComponent } from '../tool-layout.component';
import { TOOL_STYLES, copyToClipboard } from '../tool-ui';

type Triplet = { r: boolean; w: boolean; x: boolean };

function tripletToOctal(t: Triplet): number {
  return (t.r ? 4 : 0) + (t.w ? 2 : 0) + (t.x ? 1 : 0);
}
function octalToTriplet(n: number): Triplet {
  return { r: (n & 4) !== 0, w: (n & 2) !== 0, x: (n & 1) !== 0 };
}
function tripletToSymbolic(t: Triplet): string {
  return (t.r ? 'r' : '-') + (t.w ? 'w' : '-') + (t.x ? 'x' : '-');
}

@Component({
  selector: 'app-tool-chmod',
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout title="Chmod Calculator" subtitle="Unix file permissions: symbolic ↔ octal">
      <div class="card">
        <h3 class="card-title">Permissions</h3>
        <div class="perm-grid">
          <div class="perm-head">
            <span></span>
            <span>R</span><span>W</span><span>X</span>
            <span>OCT</span>
          </div>
          @for (row of rows; track row.key) {
            <div class="perm-row">
              <span class="perm-label">{{ row.label }}</span>
              <label class="perm-box">
                <input type="checkbox" [checked]="perms()[row.key].r" (change)="toggle(row.key, 'r', $event)" aria-label="Read" />
              </label>
              <label class="perm-box">
                <input type="checkbox" [checked]="perms()[row.key].w" (change)="toggle(row.key, 'w', $event)" aria-label="Write" />
              </label>
              <label class="perm-box">
                <input type="checkbox" [checked]="perms()[row.key].x" (change)="toggle(row.key, 'x', $event)" aria-label="Execute" />
              </label>
              <span class="perm-octal">{{ octalFor(row.key) }}</span>
            </div>
          }
        </div>
      </div>
      <div class="card">
        <h3 class="card-title">Result</h3>
        <div class="row">
          <label>
            Octal
            <input type="text" [value]="octal()" (input)="onOctal($event)" />
          </label>
          <label>
            Symbolic
            <div class="output-val">{{ symbolic() }}</div>
          </label>
        </div>
        <label>
          Command
          <div class="output-val">chmod {{ octal() }} path/to/file</div>
        </label>
        <div class="actions">
          <button class="btn" (click)="copy()">{{ copied() ? 'Copied!' : 'Copy command' }}</button>
        </div>
      </div>
    </app-tool-layout>
  `,
  styles: [TOOL_STYLES, `
    .perm-grid {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .perm-head, .perm-row {
      display: grid;
      grid-template-columns: minmax(8rem, 1fr) 2.25rem 2.25rem 2.25rem 3rem;
      align-items: center;
      gap: 0.5rem;
    }
    .perm-head {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted-foreground);
      padding: 0 0 0.375rem;
      border-bottom: 1px solid var(--border);
    }
    .perm-head > span { text-align: center; }
    .perm-head > span:first-child { text-align: left; }
    .perm-row {
      padding: 0.375rem 0;
    }
    .perm-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--foreground);
      letter-spacing: normal;
      text-transform: none;
    }
    .perm-box {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      height: 2rem;
      border-radius: calc(var(--radius) - 3px);
      background: color-mix(in srgb, var(--secondary) 50%, transparent);
      cursor: pointer;
      letter-spacing: normal;
      text-transform: none;
    }
    .perm-box input { margin: 0; }
    .perm-octal {
      text-align: center;
      font-family: 'JetBrains Mono', monospace;
      font-size: 1rem;
      font-weight: 600;
      color: var(--primary);
    }

    @media (max-width: 560px) {
      .perm-head, .perm-row {
        grid-template-columns: 1fr repeat(3, 2rem) 2.5rem;
        gap: 0.375rem;
      }
      .perm-label { font-size: 0.75rem; }
    }
  `],
})
export class ChmodComponent {
  readonly rows = [
    { key: 'u' as const, label: 'User (owner)' },
    { key: 'g' as const, label: 'Group' },
    { key: 'o' as const, label: 'Other' },
  ];

  readonly perms = signal<{ u: Triplet; g: Triplet; o: Triplet }>({
    u: { r: true, w: true, x: false },
    g: { r: true, w: false, x: false },
    o: { r: true, w: false, x: false },
  });
  readonly copied = signal(false);

  readonly octal = computed(() => {
    const p = this.perms();
    return `${tripletToOctal(p.u)}${tripletToOctal(p.g)}${tripletToOctal(p.o)}`;
  });
  readonly symbolic = computed(() => {
    const p = this.perms();
    return tripletToSymbolic(p.u) + tripletToSymbolic(p.g) + tripletToSymbolic(p.o);
  });

  octalFor(key: 'u' | 'g' | 'o'): number { return tripletToOctal(this.perms()[key]); }

  toggle(owner: 'u' | 'g' | 'o', bit: 'r' | 'w' | 'x', ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    this.perms.set({ ...this.perms(), [owner]: { ...this.perms()[owner], [bit]: checked } });
  }
  onOctal(ev: Event) {
    const raw = (ev.target as HTMLInputElement).value.trim();
    if (!/^[0-7]{3}$/.test(raw)) return;
    const [u, g, o] = raw.split('').map(Number);
    this.perms.set({ u: octalToTriplet(u), g: octalToTriplet(g), o: octalToTriplet(o) });
  }
  async copy() {
    if (await copyToClipboard(`chmod ${this.octal()} path/to/file`)) {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    }
  }
}
