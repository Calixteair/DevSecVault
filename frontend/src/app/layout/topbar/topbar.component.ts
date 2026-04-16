import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  Search,
  User,
  Sun,
  Moon,
  Bell,
  LogIn,
  LogOut,
  Shield,
  Crown,
} from 'lucide-angular';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';

const icons = { Search, User, Sun, Moon, Bell, LogIn, LogOut, Shield, Crown };

@Component({
  selector: 'app-topbar',
  imports: [LucideAngularModule, AsyncPipe],
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
        @if (auth.isAuthenticated$ | async) {
          @if (auth.userData$ | async; as user) {
            <div class="user-badge">
              @if (user.roles.includes('ROLE_ADMIN')) {
                <lucide-icon name="shield" [size]="16" [strokeWidth]="2" class="role-icon role-admin"></lucide-icon>
              } @else if (user.roles.includes('ROLE_TEAM_LEAD')) {
                <lucide-icon name="crown" [size]="16" [strokeWidth]="2" class="role-icon role-lead"></lucide-icon>
              } @else {
                <lucide-icon name="user" [size]="16" [strokeWidth]="2"></lucide-icon>
              }
              <span class="user-name">{{ user.username }}</span>
              <span class="user-role">
                @if (user.roles.includes('ROLE_ADMIN')) {
                  (Admin)
                } @else if (user.roles.includes('ROLE_TEAM_LEAD')) {
                  (Team Lead)
                } @else {
                  (User)
                }
              </span>
            </div>
            <button class="icon-btn" (click)="auth.logout()" title="Logout">
              <lucide-icon name="log-out" [size]="18" [strokeWidth]="2"></lucide-icon>
            </button>
          }
        } @else {
          <div class="user-badge">
            <lucide-icon name="user" [size]="16" [strokeWidth]="2"></lucide-icon>
            <span class="user-name">Guest</span>
          </div>
          <button class="login-btn" (click)="auth.login()">
            <lucide-icon name="log-in" [size]="16" [strokeWidth]="2"></lucide-icon>
            <span>Login</span>
          </button>
        }

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
    .role-icon.role-admin {
      color: var(--destructive);
    }
    .role-icon.role-lead {
      color: var(--accent);
    }
    .login-btn {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      height: 2.25rem;
      padding: 0 0.75rem;
      border-radius: var(--radius);
      border: none;
      background: var(--primary);
      color: var(--primary-foreground);
      font-family: inherit;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.15s ease;
    }
    .login-btn:hover {
      opacity: 0.9;
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
  readonly auth = inject(AuthService);
}
