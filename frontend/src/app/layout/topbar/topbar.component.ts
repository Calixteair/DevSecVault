import { Component, inject } from '@angular/core';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  Search,
  User,
  Sun,
  Moon,
  Bell,
} from 'lucide-angular';
import { ThemeService } from '../../core/services/theme.service';

const icons = { Search, User, Sun, Moon, Bell };

@Component({
  selector: 'app-topbar',
  imports: [LucideAngularModule],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <header class="topbar">
      <div class="topbar-search">
        <lucide-icon name="search" [size]="16" [strokeWidth]="2" class="search-icon"></lucide-icon>
        <input
          type="text"
          class="search-input font-mono"
          placeholder="Search snippets, tools, payloads... (Cmd+K)"
          readonly
        />
      </div>

      <div class="topbar-actions">
        <div class="user-badge">
          <lucide-icon name="user" [size]="16" [strokeWidth]="2"></lucide-icon>
          <span class="user-name">Guest</span>
          <span class="user-role">(Guest)</span>
        </div>

        <button class="icon-btn" (click)="themeService.toggle()" title="Toggle theme">
          @if (themeService.isDark()) {
            <lucide-icon name="sun" [size]="18" [strokeWidth]="2"></lucide-icon>
          } @else {
            <lucide-icon name="moon" [size]="18" [strokeWidth]="2"></lucide-icon>
          }
        </button>

        <button class="icon-btn notification-btn" title="Notifications">
          <lucide-icon name="bell" [size]="18" [strokeWidth]="2"></lucide-icon>
          <span class="notification-dot"></span>
        </button>
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      height: 4rem;
      min-height: 4rem;
      background: var(--card);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      gap: 1rem;
    }
    .topbar-search {
      display: flex;
      align-items: center;
      flex: 1;
      max-width: 36rem;
      position: relative;
    }
    .search-icon {
      position: absolute;
      left: 0.75rem;
      color: var(--muted-foreground);
      pointer-events: none;
    }
    .search-input {
      width: 100%;
      height: 2.25rem;
      padding: 0 0.75rem 0 2.25rem;
      background: var(--input-background);
      border: 1px solid var(--input);
      border-radius: var(--radius);
      color: var(--foreground);
      font-size: 0.8125rem;
      outline: none;
      cursor: pointer;
      transition: border-color 0.15s ease;
    }
    .search-input::placeholder {
      color: var(--muted-foreground);
    }
    .search-input:focus {
      border-color: var(--ring);
    }
    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .user-badge {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      color: var(--foreground);
      font-size: 0.8125rem;
    }
    .user-role {
      color: var(--muted-foreground);
      font-size: 0.75rem;
    }
    .icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: var(--radius);
      border: none;
      background: transparent;
      color: var(--muted-foreground);
      cursor: pointer;
      transition: background-color 0.15s ease, color 0.15s ease;
    }
    .icon-btn:hover {
      background: var(--secondary);
      color: var(--foreground);
    }
    .notification-btn {
      position: relative;
    }
    .notification-dot {
      position: absolute;
      top: 0.375rem;
      right: 0.375rem;
      width: 0.5rem;
      height: 0.5rem;
      background: var(--destructive);
      border-radius: 50%;
      border: 2px solid var(--card);
    }
  `],
})
export class TopbarComponent {
  readonly themeService = inject(ThemeService);
}
