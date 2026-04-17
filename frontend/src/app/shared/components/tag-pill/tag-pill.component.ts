import { Component, input } from '@angular/core';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  Hash,
  Star,
} from 'lucide-angular';

const icons = { Hash, Star };

/**
 * Small tag chip used across Dev Library, Cyber Toolbox, Teams and Admin.
 *
 * Renders a Hash icon for regular tags and a Star icon for official ones —
 * keeping the "official" signal consistent everywhere. `isOfficial` drives a
 * color variant (accent instead of primary) so the eye picks them out in a
 * long list.
 *
 * Usage:
 *   <app-tag-pill [name]="tag.name" [isOfficial]="tag.isOfficial" />
 */
@Component({
  selector: 'app-tag-pill',
  standalone: true,
  imports: [LucideAngularModule],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <span class="tag-pill font-mono" [class.official]="isOfficial()">
      @if (isOfficial()) {
        <lucide-icon name="star" [size]="10" [strokeWidth]="2.5"></lucide-icon>
      } @else {
        <lucide-icon name="hash" [size]="10" [strokeWidth]="2"></lucide-icon>
      }
      <span class="tag-pill-name">{{ name() }}</span>
    </span>
  `,
  styles: [`
    .tag-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.125rem 0.5rem;
      background: color-mix(in srgb, var(--primary) 10%, transparent);
      color: var(--primary);
      border: 1px solid color-mix(in srgb, var(--primary) 22%, transparent);
      border-radius: 999px;
      font-size: 0.6875rem;
      font-weight: 500;
      line-height: 1.35;
      white-space: nowrap;
    }
    .tag-pill.official {
      background: color-mix(in srgb, var(--accent) 14%, transparent);
      color: var(--accent);
      border-color: color-mix(in srgb, var(--accent) 38%, transparent);
    }
    .tag-pill-name { letter-spacing: 0.01em; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  `],
})
export class TagPillComponent {
  readonly name = input.required<string>();
  readonly isOfficial = input<boolean>(false);
}
