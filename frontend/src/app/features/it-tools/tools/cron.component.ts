import { Component, computed, signal } from '@angular/core';
import { ToolLayoutComponent } from '../tool-layout.component';
import { TOOL_STYLES, copyToClipboard } from '../tool-ui';

/**
 * Cron validator + human description.
 * Supports 5-field cron (min hour dom month dow). No ranges/step math beyond
 * basic * and comma lists and n/step shortcuts — enough for practical use.
 */
function validateField(v: string, min: number, max: number, labels?: string[]): boolean {
  if (v === '*') return true;
  return v.split(',').every(chunk => {
    // step: */5 or 2-30/5
    const stepMatch = chunk.match(/^(\*|\d+|\d+-\d+)\/(\d+)$/);
    if (stepMatch) {
      const step = Number(stepMatch[2]);
      return step > 0;
    }
    // range: 1-5
    const rangeMatch = chunk.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const a = Number(rangeMatch[1]), b = Number(rangeMatch[2]);
      return a >= min && b <= max && a <= b;
    }
    // single number
    if (/^\d+$/.test(chunk)) {
      const n = Number(chunk);
      return n >= min && n <= max;
    }
    // label (e.g. JAN, MON)
    if (labels && labels.includes(chunk.toUpperCase())) return true;
    return false;
  });
}

function describe(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return 'Expected 5 fields: minute hour day-of-month month day-of-week';
  const [m, h, dom, mon, dow] = parts;
  const out: string[] = [];
  if (m === '*' && h === '*') out.push('Every minute');
  else if (m !== '*' && h !== '*') out.push(`At ${h.padStart(2, '0')}:${m.padStart(2, '0')}`);
  else if (h === '*') out.push(`At minute ${m} of every hour`);
  else out.push(`At ${h}:00 every matching minute`);
  if (dom !== '*') out.push(`on day-of-month ${dom}`);
  if (mon !== '*') out.push(`in month ${mon}`);
  if (dow !== '*') out.push(`on day-of-week ${dow}`);
  return out.join(', ');
}

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

@Component({
  selector: 'app-tool-cron',
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout title="Cron Builder" subtitle="Validate and explain cron expressions (5-field)">
      <div class="card">
        <label>
          Expression
          <input type="text" [value]="expr()" (input)="onExpr($event)" placeholder="*/5 * * * *" />
        </label>
        <div class="meta">
          Fields: <code>minute (0-59) · hour (0-23) · day-of-month (1-31) · month (1-12 or JAN-DEC) · day-of-week (0-6 or SUN-SAT)</code>
        </div>
        <div class="actions">
          @for (p of presets; track p.expr) {
            <button class="btn" (click)="setExpr(p.expr)">{{ p.label }}</button>
          }
        </div>
      </div>
      <div class="card">
        <h3 class="card-title">Human-readable</h3>
        @if (valid()) {
          <p class="output-val">{{ description() }}</p>
        } @else {
          <p class="error">Invalid expression — check field ranges.</p>
        }
        <div class="actions">
          <button class="btn" (click)="copy()">{{ copied() ? 'Copied!' : 'Copy expression' }}</button>
        </div>
      </div>
    </app-tool-layout>
  `,
  styles: [TOOL_STYLES],
})
export class CronComponent {
  readonly expr = signal('*/5 * * * *');
  readonly copied = signal(false);
  readonly presets = [
    { label: 'Every minute', expr: '* * * * *' },
    { label: 'Every 5 min', expr: '*/5 * * * *' },
    { label: 'Hourly', expr: '0 * * * *' },
    { label: 'Daily 03:00', expr: '0 3 * * *' },
    { label: 'Mon 09:00', expr: '0 9 * * 1' },
    { label: 'First of month', expr: '0 0 1 * *' },
  ];

  readonly valid = computed(() => {
    const p = this.expr().trim().split(/\s+/);
    if (p.length !== 5) return false;
    return validateField(p[0], 0, 59)
      && validateField(p[1], 0, 23)
      && validateField(p[2], 1, 31)
      && validateField(p[3], 1, 12, MONTHS)
      && validateField(p[4], 0, 6, DAYS);
  });
  readonly description = computed(() => describe(this.expr()));

  onExpr(ev: Event) { this.expr.set((ev.target as HTMLInputElement).value); }
  setExpr(e: string) { this.expr.set(e); }
  async copy() {
    if (await copyToClipboard(this.expr())) {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    }
  }
}
