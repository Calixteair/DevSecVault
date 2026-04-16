import { Component, computed, signal } from '@angular/core';
import { ToolLayoutComponent } from '../tool-layout.component';
import { TOOL_STYLES, copyToClipboard } from '../tool-ui';

/**
 * CVSS 3.1 Base Score calculator — implements the formula from FIRST's
 * official spec (first.org/cvss/v3.1/specification-document). Only base
 * metrics are covered; temporal/environmental scoring is not in scope here.
 */

type MetricKey = 'AV' | 'AC' | 'PR' | 'UI' | 'S' | 'C' | 'I' | 'A';
interface MetricOption { value: string; label: string; weight: number; }
interface MetricDef {
  key: MetricKey;
  label: string;
  options: MetricOption[];
}

// PR weight depends on scope — handled specially in the formula
const METRICS: MetricDef[] = [
  {
    key: 'AV', label: 'Attack Vector',
    options: [
      { value: 'N', label: 'Network', weight: 0.85 },
      { value: 'A', label: 'Adjacent', weight: 0.62 },
      { value: 'L', label: 'Local', weight: 0.55 },
      { value: 'P', label: 'Physical', weight: 0.2 },
    ],
  },
  {
    key: 'AC', label: 'Attack Complexity',
    options: [
      { value: 'L', label: 'Low', weight: 0.77 },
      { value: 'H', label: 'High', weight: 0.44 },
    ],
  },
  {
    key: 'PR', label: 'Privileges Required',
    options: [
      { value: 'N', label: 'None', weight: 0.85 },
      { value: 'L', label: 'Low', weight: 0.62 },   // scope changed: 0.68
      { value: 'H', label: 'High', weight: 0.27 },  // scope changed: 0.5
    ],
  },
  {
    key: 'UI', label: 'User Interaction',
    options: [
      { value: 'N', label: 'None', weight: 0.85 },
      { value: 'R', label: 'Required', weight: 0.62 },
    ],
  },
  {
    key: 'S', label: 'Scope',
    options: [
      { value: 'U', label: 'Unchanged', weight: 0 },
      { value: 'C', label: 'Changed', weight: 0 },
    ],
  },
  {
    key: 'C', label: 'Confidentiality',
    options: [
      { value: 'H', label: 'High', weight: 0.56 },
      { value: 'L', label: 'Low', weight: 0.22 },
      { value: 'N', label: 'None', weight: 0 },
    ],
  },
  {
    key: 'I', label: 'Integrity',
    options: [
      { value: 'H', label: 'High', weight: 0.56 },
      { value: 'L', label: 'Low', weight: 0.22 },
      { value: 'N', label: 'None', weight: 0 },
    ],
  },
  {
    key: 'A', label: 'Availability',
    options: [
      { value: 'H', label: 'High', weight: 0.56 },
      { value: 'L', label: 'Low', weight: 0.22 },
      { value: 'N', label: 'None', weight: 0 },
    ],
  },
];

type Selections = Record<MetricKey, string>;

function weightOf(key: MetricKey, value: string, scopeChanged = false): number {
  if (key === 'PR') {
    if (value === 'N') return 0.85;
    if (value === 'L') return scopeChanged ? 0.68 : 0.62;
    return scopeChanged ? 0.5 : 0.27;
  }
  const def = METRICS.find(m => m.key === key)!;
  return def.options.find(o => o.value === value)!.weight;
}

function roundUp(x: number): number {
  // CVSS 3.1 §7.1 "Roundup" — keep one decimal, always round up at 0.1 granularity
  return Math.ceil(x * 10) / 10;
}

function score(sel: Selections): { base: number; impact: number; exploitability: number } {
  const scopeChanged = sel.S === 'C';
  const iscBase = 1 - (1 - weightOf('C', sel.C)) * (1 - weightOf('I', sel.I)) * (1 - weightOf('A', sel.A));
  const impact = scopeChanged
    ? 7.52 * (iscBase - 0.029) - 3.25 * Math.pow(iscBase - 0.02, 15)
    : 6.42 * iscBase;
  const exploitability = 8.22 * weightOf('AV', sel.AV) * weightOf('AC', sel.AC)
    * weightOf('PR', sel.PR, scopeChanged) * weightOf('UI', sel.UI);
  let base: number;
  if (impact <= 0) base = 0;
  else if (scopeChanged) base = roundUp(Math.min(1.08 * (impact + exploitability), 10));
  else base = roundUp(Math.min(impact + exploitability, 10));
  return { base, impact: Math.round(impact * 10) / 10, exploitability: Math.round(exploitability * 10) / 10 };
}

function severityFor(s: number): { label: string; color: string } {
  if (s === 0) return { label: 'None', color: 'var(--muted-foreground)' };
  if (s < 4) return { label: 'Low', color: '#EAB308' };
  if (s < 7) return { label: 'Medium', color: '#F97316' };
  if (s < 9) return { label: 'High', color: 'var(--destructive)' };
  return { label: 'Critical', color: 'var(--destructive)' };
}

@Component({
  selector: 'app-tool-cvss',
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout title="CVSS Calculator" subtitle="CVSS 3.1 Base Score — compute severity from the vector metrics">
      <div class="card">
        <h3 class="card-title">Base metrics</h3>
        <div class="row">
          @for (m of metrics; track m.key) {
            <label>
              {{ m.label }} ({{ m.key }})
              <select (change)="onChange(m.key, $event)" [value]="sel()[m.key]">
                @for (opt of m.options; track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </label>
          }
        </div>
      </div>
      <div class="card">
        <h3 class="card-title">Result</h3>
        <div class="score-block">
          <span class="meta">Base score</span>
          <span class="score-val" [style.color]="severity().color" [style.border-color]="severity().color">
            {{ result().base.toFixed(1) }}
            <span class="score-label">{{ severity().label }}</span>
          </span>
        </div>
        <div class="output-row"><span class="meta">Impact subscore</span><span class="output-val">{{ result().impact }}</span></div>
        <div class="output-row"><span class="meta">Exploitability subscore</span><span class="output-val">{{ result().exploitability }}</span></div>
        <label>
          Vector string
          <div class="output-val">{{ vector() }}</div>
        </label>
        <div class="actions">
          <button class="btn" (click)="copy()">{{ copied() ? 'Copied!' : 'Copy vector' }}</button>
        </div>
      </div>
    </app-tool-layout>
  `,
  styles: [TOOL_STYLES, `
    .score-block {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .score-val {
      display: inline-flex;
      align-items: baseline;
      gap: 0.75rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: clamp(2rem, 6vw, 2.75rem);
      font-weight: 700;
      padding: 0.75rem 1rem;
      border: 1px solid currentColor;
      border-left-width: 4px;
      border-radius: calc(var(--radius) - 2px);
      background: color-mix(in srgb, currentColor 6%, transparent);
      letter-spacing: -0.02em;
      line-height: 1;
    }
    .score-label {
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
  `],
})
export class CvssComponent {
  readonly metrics = METRICS;
  readonly sel = signal<Selections>({
    AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'H', I: 'H', A: 'H',
  });
  readonly copied = signal(false);

  readonly result = computed(() => score(this.sel()));
  readonly severity = computed(() => severityFor(this.result().base));
  readonly vector = computed(() => {
    const s = this.sel();
    return `CVSS:3.1/AV:${s.AV}/AC:${s.AC}/PR:${s.PR}/UI:${s.UI}/S:${s.S}/C:${s.C}/I:${s.I}/A:${s.A}`;
  });

  onChange(key: MetricKey, ev: Event) {
    this.sel.set({ ...this.sel(), [key]: (ev.target as HTMLSelectElement).value });
  }
  async copy() {
    if (await copyToClipboard(this.vector())) {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    }
  }
}
