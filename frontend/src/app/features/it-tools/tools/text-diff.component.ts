import { Component, computed, signal } from '@angular/core';
import { ToolLayoutComponent } from '../tool-layout.component';
import { TOOL_STYLES } from '../tool-ui';

type Op = 'equal' | 'add' | 'del';
interface DiffLine { op: Op; left?: string; right?: string; leftNo?: number; rightNo?: number; }

/**
 * Compute line-level diff using a classic LCS (Longest Common Subsequence) DP.
 * Returns a list of unified ops suitable for a side-by-side view.
 * Fine for reasonable inputs (a few thousand lines).
 */
function diffLines(a: string[], b: string[]): DiffLine[] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0, j = 0, li = 1, ri = 1;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push({ op: 'equal', left: a[i], right: b[j], leftNo: li++, rightNo: ri++ });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ op: 'del', left: a[i], leftNo: li++ });
      i++;
    } else {
      out.push({ op: 'add', right: b[j], rightNo: ri++ });
      j++;
    }
  }
  while (i < m) { out.push({ op: 'del', left: a[i++], leftNo: li++ }); }
  while (j < n) { out.push({ op: 'add', right: b[j++], rightNo: ri++ }); }
  return out;
}

@Component({
  selector: 'app-tool-text-diff',
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout title="Text Diff" subtitle="Compare two texts line by line">
      <div class="card">
        <div class="row">
          <label>
            Original
            <textarea rows="10" [value]="left()" (input)="onLeft($event)"></textarea>
          </label>
          <label>
            Modified
            <textarea rows="10" [value]="right()" (input)="onRight($event)"></textarea>
          </label>
        </div>
      </div>
      <div class="card">
        <h3 class="card-title">
          Diff —
          <span class="diff-stat diff-removed">−{{ removed() }}</span>
          <span class="diff-stat diff-added">+{{ added() }}</span>
        </h3>
        <div class="diff-wrap">
          @for (line of diff(); track $index) {
            <div class="diff-row" [class.diff-add]="line.op === 'add'" [class.diff-del]="line.op === 'del'">
              <span class="diff-no">{{ line.leftNo ?? '' }}</span>
              <span class="diff-cell diff-left">{{ line.left ?? '' }}</span>
              <span class="diff-no">{{ line.rightNo ?? '' }}</span>
              <span class="diff-cell diff-right">{{ line.right ?? '' }}</span>
            </div>
          }
        </div>
      </div>
    </app-tool-layout>
  `,
  styles: [TOOL_STYLES, `
    .diff-stat {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      padding: 0.125rem 0.4rem;
      border-radius: 3px;
      letter-spacing: 0.04em;
    }
    .diff-removed {
      color: var(--destructive);
      background: color-mix(in srgb, var(--destructive) 12%, transparent);
    }
    .diff-added {
      color: var(--primary);
      background: color-mix(in srgb, var(--primary) 12%, transparent);
    }
    .diff-wrap {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8125rem;
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) - 3px);
      overflow-x: auto;
      max-height: 32rem;
      overflow-y: auto;
    }
    .diff-row {
      display: grid;
      grid-template-columns: 3rem minmax(0, 1fr) 3rem minmax(0, 1fr);
      gap: 0.5rem;
      padding: 0.15rem 0.5rem;
      min-width: 30rem;
    }
    .diff-add { background: color-mix(in srgb, var(--primary) 10%, transparent); }
    .diff-del { background: color-mix(in srgb, var(--destructive) 10%, transparent); }
    .diff-no {
      color: var(--muted-foreground);
      text-align: right;
      user-select: none;
      font-size: 0.75rem;
    }
    .diff-cell {
      white-space: pre-wrap;
      word-break: break-all;
    }
    .diff-del .diff-left { color: var(--destructive); }
    .diff-add .diff-right { color: var(--primary); }

    /* On phones, stack: left block then right block per line. */
    @media (max-width: 640px) {
      .diff-row {
        grid-template-columns: 2.5rem minmax(0, 1fr);
        min-width: 0;
        row-gap: 0;
      }
      .diff-row .diff-no:nth-of-type(2) { display: none; }
      .diff-row .diff-right {
        grid-column: 2 / 3;
        padding-left: 0.75rem;
        border-left: 2px solid var(--border);
      }
      .diff-add .diff-right { border-left-color: var(--primary); }
      .diff-del .diff-left { border-left: 2px solid var(--destructive); padding-left: 0.75rem; }
    }
  `],
})
export class TextDiffComponent {
  readonly left = signal('hello world\nthis is line 2\nand this is line 3');
  readonly right = signal('hello world\nthis is line 2 modified\nand this is line 3\nnew line added');

  readonly diff = computed(() => diffLines(this.left().split('\n'), this.right().split('\n')));
  readonly added = computed(() => this.diff().filter(d => d.op === 'add').length);
  readonly removed = computed(() => this.diff().filter(d => d.op === 'del').length);

  bgFor(op: Op): string {
    if (op === 'add') return 'color-mix(in srgb, var(--primary) 15%, transparent)';
    if (op === 'del') return 'color-mix(in srgb, var(--destructive) 15%, transparent)';
    return '';
  }
  onLeft(ev: Event) { this.left.set((ev.target as HTMLTextAreaElement).value); }
  onRight(ev: Event) { this.right.set((ev.target as HTMLTextAreaElement).value); }
}
