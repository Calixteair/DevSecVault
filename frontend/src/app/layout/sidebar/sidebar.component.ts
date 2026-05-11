import { Component, Signal, computed, inject, signal, HostListener } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
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
  LogIn,
  ChevronRight,
} from 'lucide-angular';
import { AuthService, UserProfile } from '../../core/services/auth.service';

const icons = { LayoutDashboard, Code, Wrench, Send, Hammer, Settings, Shield, User, Users, LogIn, ChevronRight };

interface NavItem {
  path: string;
  icon: string;
  label: string;
  kbd?: string;
  /** Lowercased key paired with Alt to navigate to `path`. */
  key?: string;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  mobile?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <!-- ============ Desktop sidebar ============ -->
    <aside class="sidebar desktop-only" aria-label="Navigation principale">
      <!-- Prompt logo -->
      <a routerLink="/dashboard" class="brand">
        <span class="brand-prompt font-mono">&gt;&gt;</span><span class="brand-name font-mono">dsv</span><span class="brand-caret caret" aria-hidden="true"></span>
      </a>

      <nav class="nav">
        @for (section of visibleSections(); track section.label) {
          <div class="nav-section">
            <div class="nav-section-label font-mono">{{ section.label }}</div>
            @for (item of section.items; track item.path) {
              <a
                [routerLink]="item.path"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: item.path === '/dashboard' }"
                class="nav-item"
              >
                <lucide-icon [name]="item.icon" [size]="15" [strokeWidth]="1.75" class="nav-icon"></lucide-icon>
                <span class="nav-label">{{ item.label }}</span>
                @if (item.key) {
                  <span class="nav-kbd-pair" [class.kbd-armed]="gPending()">
                    <kbd class="nav-kbd nav-kbd-mod">g</kbd>
                    <kbd class="nav-kbd">{{ item.key }}</kbd>
                  </span>
                }
              </a>
            }
          </div>
        }
      </nav>

      <!-- Bottom user block -->
      <div class="nav-foot">
        @if (isAuthenticated()) {
          @let user = userData();
          @if (user !== null) {
            <a routerLink="/profile" class="user-card">
              <span class="user-avatar font-mono">{{ initials(user.username) }}</span>
              <span class="user-meta">
                <span class="user-name">{{ user.username }}</span>
                <span class="user-role font-mono">{{ roleTag(user) }}</span>
              </span>
              <lucide-icon name="chevron-right" [size]="14" [strokeWidth]="1.75" class="user-chev"></lucide-icon>
            </a>
          }
        } @else {
          <button class="login-cta" (click)="auth.login()">
            <lucide-icon name="log-in" [size]="14" [strokeWidth]="1.75"></lucide-icon>
            <span>Login</span>
          </button>
        }
      </div>
    </aside>

    <!-- ============ Mobile bottom tab bar ============ -->
    <nav class="bottom-bar mobile-only" aria-label="Navigation mobile">
      @for (item of mobileNavItems(); track item.path) {
        <a
          [routerLink]="item.path"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: item.path === '/dashboard' }"
          class="bottom-item"
        >
          <lucide-icon [name]="item.icon" [size]="18" [strokeWidth]="1.75"></lucide-icon>
          <span class="bottom-label font-mono">{{ item.label }}</span>
        </a>
      }
    </nav>
  `,
  styles: [`
    /* ============ Desktop sidebar ============ */
    .sidebar {
      width: 14rem;
      min-width: 14rem;
      height: 100dvh;
      background: var(--sidebar);
      border-right: 1px solid var(--sidebar-border);
      display: flex;
      flex-direction: column;
      padding: 1rem 0.625rem 0.875rem;
      position: relative;
    }

    /* Subtle vertical line on the right edge for terminal feel */
    .sidebar::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 1px;
      height: 100%;
      background: linear-gradient(180deg,
        transparent 0%,
        var(--border) 8%,
        var(--border) 92%,
        transparent 100%);
    }

    /* ---- Brand prompt ---- */
    .brand {
      display: inline-flex;
      align-items: baseline;
      gap: 0.375rem;
      padding: 0.5rem 0.5rem 0.875rem;
      color: var(--foreground);
      font-size: 0.9375rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      line-height: 1;
    }
    .brand-prompt {
      color: var(--primary);
      font-weight: 700;
    }
    .brand-name {
      color: var(--foreground);
      font-weight: 600;
    }
    .brand-caret {
      color: var(--primary);
      font-size: 0.9375rem;
      line-height: 1;
    }

    /* ---- Nav ---- */
    .nav {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      overflow-y: auto;
      padding-top: 0.25rem;
    }
    .nav-section {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    .nav-section-label {
      font-size: 0.625rem;
      font-weight: 600;
      color: var(--foreground-subtle);
      letter-spacing: 0.14em;
      text-transform: uppercase;
      padding: 0.375rem 0.5rem 0.25rem;
    }

    .nav-item {
      position: relative;
      display: grid;
      grid-template-columns: 1rem 1fr auto;
      align-items: center;
      gap: 0.625rem;
      padding: 0.4375rem 0.625rem;
      color: var(--foreground-muted);
      font-size: 0.8125rem;
      letter-spacing: -0.005em;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background-color 120ms var(--ease), color 120ms var(--ease);
    }
    .nav-item::before {
      content: '';
      position: absolute;
      left: -0.625rem;
      top: 50%;
      width: 2px;
      height: 0;
      background: var(--primary);
      border-radius: 0 2px 2px 0;
      transform: translateY(-50%);
      transition: height 180ms var(--ease);
    }
    .nav-item:hover {
      background: var(--surface-2);
      color: var(--foreground);
    }
    .nav-item.active {
      background: var(--primary-soft);
      color: var(--primary);
    }
    .nav-item.active::before { height: 1.125rem; }
    .nav-item.active .nav-icon { color: var(--primary); }
    .nav-item.active .nav-kbd {
      background: var(--primary-soft-strong);
      border-color: transparent;
      color: var(--primary);
    }
    .nav-item.active .nav-kbd-plus { color: var(--primary); }

    .nav-icon {
      color: var(--foreground-subtle);
      transition: color 120ms var(--ease);
    }
    .nav-item:hover .nav-icon { color: var(--foreground); }

    .nav-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .nav-kbd-pair {
      display: inline-flex;
      align-items: center;
      gap: 0.1875rem;
      flex-shrink: 0;
      transition: opacity 120ms var(--ease);
    }
    .nav-kbd-pair.kbd-armed .nav-kbd-mod {
      background: var(--primary-soft-strong);
      border-color: var(--primary);
      color: var(--primary);
    }
    .nav-kbd {
      min-width: 1.125rem;
      height: 1.125rem;
      padding: 0 0.3125rem;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-bottom-width: 2px;
      border-radius: var(--radius-sm);
      color: var(--foreground-subtle);
      font-family: var(--font-mono);
      font-size: 0.625rem;
      letter-spacing: 0.02em;
      line-height: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .nav-kbd-mod {
      text-transform: lowercase;
      letter-spacing: 0.04em;
    }

    /* ---- Bottom user / login ---- */
    .nav-foot {
      padding-top: 0.625rem;
      margin-top: 0.5rem;
      border-top: 1px dashed var(--border);
    }
    .user-card {
      display: grid;
      grid-template-columns: 1.75rem 1fr auto;
      align-items: center;
      gap: 0.625rem;
      width: 100%;
      padding: 0.5rem 0.5rem;
      border-radius: var(--radius);
      color: var(--foreground);
      transition: background-color 120ms var(--ease);
    }
    .user-card:hover { background: var(--surface-2); }
    .user-avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      background: var(--primary-soft-strong);
      color: var(--primary);
      border-radius: var(--radius-sm);
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .user-meta {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .user-name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--foreground);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .user-role {
      font-size: 0.625rem;
      color: var(--foreground-subtle);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .user-chev {
      color: var(--foreground-subtle);
      transition: transform 180ms var(--ease), color 120ms var(--ease);
    }
    .user-card:hover .user-chev {
      color: var(--primary);
      transform: translateX(2px);
    }

    .login-cta {
      display: grid;
      grid-template-columns: 1rem 1fr auto;
      align-items: center;
      gap: 0.625rem;
      width: 100%;
      padding: 0.5rem 0.625rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface-2);
      color: var(--foreground);
      font-family: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 120ms var(--ease), border-color 120ms var(--ease), color 120ms var(--ease);
    }
    .login-cta:hover {
      background: var(--primary-soft);
      border-color: var(--primary-soft-strong);
      color: var(--primary);
    }

    /* ============ Mobile bottom bar ============ */
    .bottom-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: calc(3.5rem + var(--safe-bottom, 0px));
      padding-bottom: var(--safe-bottom, 0px);
      background: color-mix(in srgb, var(--sidebar) 94%, transparent);
      -webkit-backdrop-filter: blur(14px);
      backdrop-filter: blur(14px);
      border-top: 1px solid var(--sidebar-border);
      display: flex;
      align-items: center;
      justify-content: space-around;
      z-index: 50;
    }
    .bottom-item {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      flex: 1;
      padding: 0.4375rem 0;
      color: var(--foreground-subtle);
      text-decoration: none;
      font-size: 0.625rem;
      letter-spacing: 0.02em;
      transition: color 120ms var(--ease);
      -webkit-tap-highlight-color: transparent;
    }
    .bottom-item::after {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      width: 0;
      height: 2px;
      background: var(--primary);
      border-radius: 0 0 2px 2px;
      transform: translateX(-50%);
      transition: width 180ms var(--ease);
    }
    .bottom-item.active { color: var(--primary); }
    .bottom-item.active::after { width: 1.5rem; }

    /* ============ Visibility toggles ============ */
    .desktop-only { display: flex; }
    .mobile-only { display: none; }

    @media (max-width: 1024px) {
      .sidebar { width: 12.5rem; min-width: 12.5rem; }
    }
    @media (max-width: 768px) {
      .desktop-only { display: none !important; }
      .mobile-only { display: flex !important; }
    }
  `],
})
export class SidebarComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly isAuthenticated: Signal<boolean> = toSignal(this.auth.isAuthenticated$, { initialValue: false });
  readonly userData: Signal<UserProfile | null> = toSignal(this.auth.userData$, { initialValue: null });
  private readonly isAdmin: Signal<boolean> = toSignal(this.auth.isAdmin$, { initialValue: false });

  /** Vim-style leader: `g` arms, the next key within 1.5s navigates. */
  readonly gPending = signal(false);
  private gTimeoutHandle: ReturnType<typeof setTimeout> | null = null;

  @HostListener('document:keydown', ['$event'])
  onShortcut(e: KeyboardEvent): void {
    // Skip when a modifier is held (lets ⌘K, ctrl-r, etc. pass through).
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // Don't hijack typing inside fields.
    const t = e.target as HTMLElement | null;
    if (t) {
      const tag = t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable) return;
    }
    const k = e.key.toLowerCase();
    if (k === 'escape') {
      this.clearLeader();
      return;
    }
    if (!this.gPending()) {
      if (k === 'g') {
        this.gPending.set(true);
        this.gTimeoutHandle = setTimeout(() => this.clearLeader(), 1500);
        e.preventDefault();
      }
      return;
    }
    // Leader armed: try to resolve.
    this.clearLeader();
    const item = this.sections.flatMap(s => s.items).find(i => i.key === k);
    if (!item) return;
    if (item.requiresAdmin && !this.isAdmin()) return;
    if (item.requiresAuth && !this.isAuthenticated()) return;
    e.preventDefault();
    this.router.navigateByUrl(item.path);
  }

  private clearLeader(): void {
    this.gPending.set(false);
    if (this.gTimeoutHandle) {
      clearTimeout(this.gTimeoutHandle);
      this.gTimeoutHandle = null;
    }
  }

  readonly sections: readonly NavSection[] = [
    {
      label: 'Modules',
      items: [
        { path: '/dashboard',     icon: 'layout-dashboard', label: 'Dashboard',     key: 'd', mobile: true },
        { path: '/dev-library',   icon: 'code',             label: 'Dev Library',   key: 'l', mobile: true },
        { path: '/cyber-toolbox', icon: 'wrench',           label: 'Cyber Toolbox', key: 'c', mobile: true },
        { path: '/secure-bridge', icon: 'send',             label: 'Secure Bridge', key: 'b', mobile: true },
        { path: '/it-tools',      icon: 'hammer',           label: 'IT Tools',      key: 'i', mobile: true },
      ],
    },
    {
      label: 'Workspace',
      items: [
        { path: '/teams', icon: 'users', label: 'Teams', key: 't', requiresAuth: true },
      ],
    },
    {
      label: 'System',
      items: [
        { path: '/admin',    icon: 'shield',   label: 'Admin',    key: 'a', requiresAdmin: true },
        { path: '/settings', icon: 'settings', label: 'Settings', key: 's' },
      ],
    },
  ];

  readonly visibleSections = computed<NavSection[]>(() =>
    this.sections
      .map(section => ({
        label: section.label,
        items: section.items.filter(item => {
          if (item.requiresAdmin) return this.isAdmin();
          if (item.requiresAuth) return this.isAuthenticated();
          return true;
        }),
      }))
      .filter(section => section.items.length > 0),
  );

  readonly mobileNavItems = computed(() =>
    this.sections
      .flatMap(s => s.items)
      .filter(item => {
        if (!item.mobile) return false;
        if (item.requiresAdmin) return this.isAdmin();
        if (item.requiresAuth) return this.isAuthenticated();
        return true;
      })
      .slice(0, 5),
  );

  initials(name: string | undefined): string {
    if (!name) return '?';
    const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
    if (parts.length === 0) return name.slice(0, 2).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  roleTag(user: UserProfile | null): string {
    if (!user) return '';
    if (user.roles.includes('ROLE_ADMIN')) return 'admin';
    if (user.roles.includes('ROLE_TEAM_LEAD')) return 'lead';
    return 'user';
  }
}
