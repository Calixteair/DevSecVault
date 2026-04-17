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
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <nav class="sidebar">
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
        <a
          routerLink="/settings"
          routerLinkActive="active"
          class="nav-item"
          title="Settings"
        >
          <lucide-icon name="settings" [size]="20" [strokeWidth]="2"></lucide-icon>
        </a>
        <div class="nav-item profile-icon" title="Profile">
          <lucide-icon name="user" [size]="20" [strokeWidth]="2"></lucide-icon>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .sidebar {
      width: 4rem;
      min-width: 4rem;
      height: 100vh;
      background: var(--sidebar);
      border-right: 1px solid var(--sidebar-border);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.75rem 0;
    }
    .sidebar-top {
      margin-bottom: 1.5rem;
    }
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
  `],
})
export class SidebarComponent {
  private readonly auth = inject(AuthService);
  private readonly isAuthenticated: Signal<boolean> = toSignal(this.auth.isAuthenticated$, { initialValue: false });
  private readonly isAdmin: Signal<boolean> = toSignal(this.auth.isAdmin$, { initialValue: false });

  readonly navItems: readonly NavItem[] = [
    { path: '/dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
    { path: '/dev-library', icon: 'code', label: 'Dev Library' },
    { path: '/cyber-toolbox', icon: 'wrench', label: 'Cyber Toolbox' },
    { path: '/secure-bridge', icon: 'send', label: 'Secure Bridge' },
    { path: '/teams', icon: 'users', label: 'Teams', requiresAuth: true },
    { path: '/it-tools', icon: 'hammer', label: 'IT Tools' },
    { path: '/admin', icon: 'shield', label: 'Admin', requiresAdmin: true },
  ];

  readonly visibleNavItems = computed(() =>
    this.navItems.filter(item => {
      if (item.requiresAdmin) return this.isAdmin();
      if (item.requiresAuth) return this.isAuthenticated();
      return true;
    })
  );
}
