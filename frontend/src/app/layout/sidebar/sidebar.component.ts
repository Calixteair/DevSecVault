import { Component, Signal, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  LayoutDashboard,
  Code,
  Wrench,
  Send,
  Hammer,
  Settings,
  Shield,
  User,
  Users,
} from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';

const icons = { LayoutDashboard, Code, Wrench, Send, Hammer, Settings, Shield, User, Users };

interface NavItem {
  path: string;
  icon: string;
  label: string;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  /** If true, shown in the mobile bottom bar (max ~5 items). */
  mobile?: boolean;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <!-- Desktop sidebar -->
    <nav class="sidebar desktop-only">
      <div class="sidebar-top">
        <a routerLink="/dashboard" class="logo">D</a>
      </div>

      <div class="sidebar-nav">
        @for (item of visibleNavItems(); track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: item.path === '/dashboard' }"
            class="nav-item"
            [attr.title]="item.label"
          >
            <lucide-icon [name]="item.icon" [size]="20" [strokeWidth]="2"></lucide-icon>
          </a>
        }
      </div>

      <div class="sidebar-bottom">
        <a routerLink="/settings" routerLinkActive="active" class="nav-item" title="Settings">
          <lucide-icon name="settings" [size]="20" [strokeWidth]="2"></lucide-icon>
        </a>
        <a routerLink="/profile" routerLinkActive="active" class="nav-item" title="Profile">
          <lucide-icon name="user" [size]="20" [strokeWidth]="2"></lucide-icon>
        </a>
      </div>
    </nav>

    <!-- Mobile bottom tab bar -->
    <nav class="bottom-bar mobile-only">
      @for (item of mobileNavItems(); track item.path) {
        <a
          [routerLink]="item.path"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: item.path === '/dashboard' }"
          class="bottom-item"
        >
          <lucide-icon [name]="item.icon" [size]="20" [strokeWidth]="2"></lucide-icon>
          <span class="bottom-label">{{ item.label }}</span>
        </a>
      }
    </nav>
  `,
  styles: [`
    /* ---- Desktop sidebar ---- */
    .sidebar {
      width: 4rem;
      min-width: 4rem;
      height: 100dvh;
      background: var(--sidebar);
      border-right: 1px solid var(--sidebar-border);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.75rem 0;
    }
    .sidebar-top { margin-bottom: 1.5rem; }
    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      background: var(--primary);
      color: var(--primary-foreground);
      border-radius: var(--radius);
      font-weight: 700;
      font-size: 1rem;
      text-decoration: none;
    }
    .sidebar-nav {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      flex: 1;
    }
    .nav-item {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: var(--radius);
      color: var(--muted-foreground);
      text-decoration: none;
      cursor: pointer;
      transition: background-color 0.15s ease, color 0.15s ease;
    }
    .nav-item:hover {
      background: var(--secondary);
      color: var(--secondary-foreground);
    }
    .nav-item.active {
      background: var(--primary);
      color: var(--primary-foreground);
    }
    .sidebar-bottom {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      margin-top: auto;
    }

    /* ---- Mobile bottom bar ---- */
    .bottom-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: calc(3.5rem + var(--safe-bottom, 0px));
      padding-bottom: var(--safe-bottom, 0px);
      background: var(--sidebar);
      border-top: 1px solid var(--sidebar-border);
      display: flex;
      align-items: center;
      justify-content: space-around;
      z-index: 50;
    }
    .bottom-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.125rem;
      flex: 1;
      padding: 0.375rem 0;
      color: var(--muted-foreground);
      text-decoration: none;
      font-size: 0.5625rem;
      font-weight: 500;
      transition: color 0.15s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .bottom-item.active {
      color: var(--primary);
    }
    .bottom-label {
      line-height: 1;
      white-space: nowrap;
    }

    /* ---- Visibility toggles ---- */
    .desktop-only { display: flex; }
    .mobile-only { display: none; }

    @media (max-width: 768px) {
      .desktop-only { display: none !important; }
      .mobile-only { display: flex !important; }
    }
  `],
})
export class SidebarComponent {
  private readonly auth = inject(AuthService);
  private readonly isAuthenticated: Signal<boolean> = toSignal(this.auth.isAuthenticated$, { initialValue: false });
  private readonly isAdmin: Signal<boolean> = toSignal(this.auth.isAdmin$, { initialValue: false });

  readonly navItems: readonly NavItem[] = [
    { path: '/dashboard', icon: 'layout-dashboard', label: 'Dashboard', mobile: true },
    { path: '/dev-library', icon: 'code', label: 'Library', mobile: true },
    { path: '/cyber-toolbox', icon: 'wrench', label: 'Toolbox', mobile: true },
    { path: '/secure-bridge', icon: 'send', label: 'Bridge', mobile: true },
    { path: '/teams', icon: 'users', label: 'Teams', requiresAuth: true },
    { path: '/it-tools', icon: 'hammer', label: 'Tools', mobile: true },
    { path: '/admin', icon: 'shield', label: 'Admin', requiresAdmin: true },
  ];

  readonly visibleNavItems = computed(() =>
    this.navItems.filter(item => {
      if (item.requiresAdmin) return this.isAdmin();
      if (item.requiresAuth) return this.isAuthenticated();
      return true;
    })
  );

  /** Mobile bottom bar: only the core 5 items */
  readonly mobileNavItems = computed(() =>
    this.visibleNavItems().filter(item => item.mobile).slice(0, 5)
  );
}
