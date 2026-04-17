import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  Settings,
  Sun,
  Moon,
  Shield,
  Bell,
  User,
  ExternalLink,
  Info,
  Palette,
} from 'lucide-angular';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService, UserProfile } from '../../core/services/auth.service';

const icons = { Settings, Sun, Moon, Shield, Bell, User, ExternalLink, Info, Palette };

@Component({
  selector: 'app-settings',
  imports: [LucideAngularModule],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <div class="page">
      <h1 class="page-title">Settings</h1>
      <p class="page-subtitle">Manage your preferences</p>

      <div class="settings-list">
        <!-- Appearance -->
        <div class="settings-card">
          <div class="settings-header">
            <div class="settings-icon icon-primary">
              <lucide-icon name="palette" [size]="18" [strokeWidth]="2"></lucide-icon>
            </div>
            <div class="settings-info">
              <h3 class="settings-name">Appearance</h3>
              <p class="settings-desc">Customize the look and feel of the application</p>
            </div>
          </div>
          <div class="settings-body">
            <div class="setting-row">
              <div class="setting-label">
                <span class="setting-text">Dark Mode</span>
                <span class="setting-hint">Switch between light and dark themes</span>
              </div>
              <button class="theme-toggle" (click)="themeService.toggle()">
                <div class="toggle-track" [class.toggle-active]="themeService.isDark()">
                  <div class="toggle-thumb">
                    @if (themeService.isDark()) {
                      <lucide-icon name="moon" [size]="12" [strokeWidth]="2"></lucide-icon>
                    } @else {
                      <lucide-icon name="sun" [size]="12" [strokeWidth]="2"></lucide-icon>
                    }
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Notifications -->
        <div class="settings-card">
          <div class="settings-header">
            <div class="settings-icon icon-accent">
              <lucide-icon name="bell" [size]="18" [strokeWidth]="2"></lucide-icon>
            </div>
            <div class="settings-info">
              <h3 class="settings-name">Notifications</h3>
              <p class="settings-desc">Configure how you receive notifications</p>
            </div>
          </div>
          <div class="settings-body">
            <div class="setting-row">
              <div class="setting-label">
                <span class="setting-text">In-App Notifications</span>
                <span class="setting-hint">Show notifications in the bell icon</span>
              </div>
              <div class="toggle-track toggle-active toggle-disabled">
                <div class="toggle-thumb">
                  <lucide-icon name="bell" [size]="12" [strokeWidth]="2"></lucide-icon>
                </div>
              </div>
            </div>
            <p class="setting-note font-mono">More notification options coming soon.</p>
          </div>
        </div>

        <!-- Security -->
        <div class="settings-card">
          <div class="settings-header">
            <div class="settings-icon icon-destructive">
              <lucide-icon name="shield" [size]="18" [strokeWidth]="2"></lucide-icon>
            </div>
            <div class="settings-info">
              <h3 class="settings-name">Security</h3>
              <p class="settings-desc">Authentication & account security</p>
            </div>
          </div>
          <div class="settings-body">
            @if (userData()) {
              <div class="setting-row">
                <div class="setting-label">
                  <span class="setting-text">Authentication Provider</span>
                  <span class="setting-hint">Your account is managed by Keycloak SSO</span>
                </div>
                <span class="provider-badge font-mono">Keycloak OIDC</span>
              </div>
              <div class="setting-row">
                <div class="setting-label">
                  <span class="setting-text">Change Password</span>
                  <span class="setting-hint">Manage password via Keycloak account console</span>
                </div>
                <a
                  href="https://auth.calixteair.fr/realms/devsecvault/account/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="link-btn"
                >
                  <lucide-icon name="external-link" [size]="14" [strokeWidth]="2"></lucide-icon>
                  Account Console
                </a>
              </div>
            } @else {
              <p class="setting-note font-mono">Log in to manage security settings.</p>
            }
          </div>
        </div>

        <!-- About -->
        <div class="settings-card">
          <div class="settings-header">
            <div class="settings-icon icon-muted">
              <lucide-icon name="info" [size]="18" [strokeWidth]="2"></lucide-icon>
            </div>
            <div class="settings-info">
              <h3 class="settings-name">About</h3>
              <p class="settings-desc">DevSec Vault — Phase 8</p>
            </div>
          </div>
          <div class="settings-body">
            <div class="about-grid font-mono">
              <span class="about-label">Platform</span>
              <span class="about-value">DevSec Vault</span>
              <span class="about-label">Frontend</span>
              <span class="about-value">Angular 21</span>
              <span class="about-label">Backend</span>
              <span class="about-value">Symfony 8</span>
              <span class="about-label">Search</span>
              <span class="about-value">Meilisearch</span>
              <span class="about-label">Auth</span>
              <span class="about-value">Keycloak OIDC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 1rem 0; max-width: 48rem; }
    .page-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--foreground);
      margin-bottom: 0.25rem;
    }
    .page-subtitle {
      font-size: 0.875rem;
      color: var(--muted-foreground);
      margin-bottom: 1.5rem;
    }

    .settings-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .settings-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .settings-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border);
    }
    .settings-icon {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .icon-primary {
      background: color-mix(in srgb, var(--primary) 15%, transparent);
      color: var(--primary);
    }
    .icon-accent {
      background: color-mix(in srgb, var(--accent) 15%, transparent);
      color: var(--accent);
    }
    .icon-destructive {
      background: color-mix(in srgb, var(--destructive) 15%, transparent);
      color: var(--destructive);
    }
    .icon-muted {
      background: var(--secondary);
      color: var(--muted-foreground);
    }
    .settings-name {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--foreground);
    }
    .settings-desc {
      font-size: 0.75rem;
      color: var(--muted-foreground);
      margin-top: 0.125rem;
    }
    .settings-body {
      padding: 1rem 1.25rem;
    }

    .setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.625rem 0;
    }
    .setting-row + .setting-row {
      border-top: 1px solid var(--border);
    }
    .setting-label { }
    .setting-text {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--foreground);
      display: block;
    }
    .setting-hint {
      font-size: 0.6875rem;
      color: var(--muted-foreground);
      display: block;
      margin-top: 0.125rem;
    }
    .setting-note {
      font-size: 0.75rem;
      color: var(--muted-foreground);
      margin-top: 0.5rem;
    }

    /* Toggle */
    .theme-toggle {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
    }
    .toggle-track {
      width: 2.75rem;
      height: 1.5rem;
      border-radius: 999px;
      background: var(--secondary);
      border: 1px solid var(--border);
      position: relative;
      transition: background-color 0.2s ease;
    }
    .toggle-track.toggle-active {
      background: var(--primary);
      border-color: var(--primary);
    }
    .toggle-track.toggle-disabled {
      opacity: 0.6;
      cursor: default;
    }
    .toggle-thumb {
      position: absolute;
      top: 0.125rem;
      left: 0.125rem;
      width: 1.125rem;
      height: 1.125rem;
      border-radius: 50%;
      background: var(--card);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--muted-foreground);
      transition: transform 0.2s ease;
    }
    .toggle-active .toggle-thumb {
      transform: translateX(1.25rem);
      color: var(--primary);
    }

    /* Provider badge */
    .provider-badge {
      font-size: 0.6875rem;
      padding: 0.25rem 0.5rem;
      background: var(--secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--muted-foreground);
    }

    /* Link button */
    .link-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: var(--primary);
      text-decoration: none;
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius);
      transition: background-color 0.15s ease;
    }
    .link-btn:hover {
      background: color-mix(in srgb, var(--primary) 10%, transparent);
    }

    /* About grid */
    .about-grid {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.375rem 1rem;
      font-size: 0.75rem;
    }
    .about-label { color: var(--muted-foreground); }
    .about-value { color: var(--foreground); }

    @media (max-width: 768px) {
      .page { padding: 0.5rem 0; }
      .page-title { font-size: 1.25rem; }
      .settings-header { padding: 0.75rem 0.875rem; gap: 0.5rem; }
      .settings-body { padding: 0.75rem 0.875rem; }
      .setting-row { flex-wrap: wrap; gap: 0.375rem; }
      .setting-label { flex: 1; min-width: 0; }
      .about-grid { gap: 0.25rem 0.75rem; }
    }
  `],
})
export class SettingsComponent {
  readonly themeService = inject(ThemeService);
  private readonly auth = inject(AuthService);
  readonly userData = toSignal(this.auth.userData$, { initialValue: null });
}
