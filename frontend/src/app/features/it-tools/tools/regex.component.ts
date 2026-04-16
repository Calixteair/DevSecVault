import { Component, computed, signal } from '@angular/core';
import { ToolLayoutComponent } from '../tool-layout.component';
import { TOOL_STYLES } from '../tool-ui';

interface Match {
  index: number;
  value: string;
  groups: string[];
  namedGroups: Record<string, string>;
}

@Component({
  selector: 'app-tool-regex',
  imports: [ToolLayoutComponent],
  template: `
    <app-tool-layout title="Regex Tester" subtitle="Test regular expressions against a text body">
      <div class="card">
        <div class="row">
          <label>
            Pattern
            <input type="text" [value]="pattern()" (input)="onPattern($event)" placeholder="\\b\\w+@\\w+\\.\\w+" />
          </label>
          <label>
            Flags
            <input type="text" [value]="flags()" (input)="onFlags($event)" placeholder="gmi" />
          </label>
        </div>
        <label>
          Test string
          <textarea rows="6" [value]="text()" (input)="onText($event)"></textarea>
        </label>
        @if (err()) {
          <p class="error">{{ err() }}</p>
        }
      </div>
      <div class="card">
        <h3 class="card-title">Matches ({{ matches().length }})</h3>
        @if (matches().length === 0) {
          <p class="meta">No match.</p>
        } @else {
          @for (m of matches(); track $index) {
            <div class="match">
              <div class="meta">Match {{ $index + 1 }} — position {{ m.index }}</div>
              <div class="output-val">{{ m.value }}</div>
              @if (m.groups.length > 0) {
                <div class="meta">Groups: [{{ m.groups.join(', ') }}]</div>
              }
            </div>
          }
        }
      </div>
    </app-tool-layout>
  `,
  styles: [TOOL_STYLES, `
    .match {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.625rem 0;
      border-bottom: 1px dashed var(--border);
    }
    .match:last-child { border-bottom: none; }
  `],
})
export class RegexComponent {
  readonly pattern = signal('\\b\\w+@\\w+\\.\\w+\\b');
  readonly flags = signal('gi');
  readonly text = signal('Contact: alice@example.com or bob@test.org, also carol@acme.io');
  readonly err = signal('');

  readonly matches = computed<Match[]>(() => {
    try {
      const flags = this.flags().includes('g') ? this.flags() : this.flags() + 'g';
      const re = new RegExp(this.pattern(), flags);
      const out: Match[] = [];
      const t = this.text();
      let m: RegExpExecArray | null;
      while ((m = re.exec(t)) !== null) {
        out.push({
          index: m.index,
          value: m[0],
          groups: m.slice(1),
          namedGroups: m.groups ?? {},
        });
        if (m[0] === '') re.lastIndex++;
        if (out.length > 500) break;
      }
      this.err.set('');
      return out;
    } catch (e) {
      this.err.set((e as Error).message);
      return [];
    }
  });

  onPattern(ev: Event) { this.pattern.set((ev.target as HTMLInputElement).value); }
  onFlags(ev: Event) { this.flags.set((ev.target as HTMLInputElement).value); }
  onText(ev: Event) { this.text.set((ev.target as HTMLTextAreaElement).value); }
}
