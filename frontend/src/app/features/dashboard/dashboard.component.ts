import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  Code,
  Wrench,
  Send,
  Hammer,
  Users,
  Shield,
  Clock,
  ArrowRight,
  FileCode,
  Plus,
  Activity,
} from 'lucide-angular';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { SeoService } from '../../core/services/seo.service';
import { DashboardData, ActivityItem } from '../../core/models/dashboard.model';

const icons = { Code, Wrench, Send, Hammer, Users, Shield, Clock, ArrowRight, FileCode, Plus, Activity };

@Component({
  selector: 'app-dashboard',
  imports: [LucideAngularModule, RouterLink],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Welcome back to DevSec Vault</p>
      </div>

      @if (isAuthenticated()) {
        <!-- Summary Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon stat-icon-primary">
              <lucide-icon name="code" [size]="20" [strokeWidth]="2"></lucide-icon>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ data()?.stats?.concepts ?? '—' }}</span>
              <span class="stat-label">Concepts</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon stat-icon-accent">
              <lucide-icon name="wrench" [size]="20" [strokeWidth]="2"></lucide-icon>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ data()?.stats?.payloads ?? '—' }}</span>
              <span class="stat-label">Payloads</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon stat-icon-destructive">
              <lucide-icon name="send" [size]="20" [strokeWidth]="2"></lucide-icon>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ data()?.stats?.secretLinks ?? '—' }}</span>
              <span class="stat-label">Secure Transfers</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon stat-icon-primary">
              <lucide-icon name="users" [size]="20" [strokeWidth]="2"></lucide-icon>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ data()?.stats?.teams ?? '—' }}</span>
              <span class="stat-label">Teams</span>
            </div>
          </div>
        </div>

        <div class="content-grid">
          <!-- Recent Activity -->
          <div class="section-card activity-section">
            <div class="section-header">
              <lucide-icon name="activity" [size]="18" [strokeWidth]="2"></lucide-icon>
              <h2 class="section-title">Recent Activity</h2>
            </div>
            <div class="activity-list">
              @for (item of data()?.recentActivity ?? []; track item.id + item.timestamp) {
                <div class="activity-item" (click)="navigateToItem(item)">
                  <div class="activity-dot" [class]="'dot-' + item.type"></div>
                  <div class="activity-content">
                    <span class="activity-action">{{ item.action === 'created' ? 'Created' : 'Updated' }}</span>
                    <span class="activity-title">{{ item.title }}</span>
                    <span class="activity-type font-mono">{{ item.type }}</span>
                  </div>
                  <span class="activity-time">{{ formatTime(item.timestamp) }}</span>
                </div>
              } @empty {
                <p class="empty-text">No recent activity</p>
              }
            </div>
          </div>

          <!-- Quick Access -->
          <div class="section-card quick-access-section">
            <div class="section-header">
              <lucide-icon name="arrow-right" [size]="18" [strokeWidth]="2"></lucide-icon>
              <h2 class="section-title">Quick Access</h2>
            </div>
            <div class="quick-grid">
              <a routerLink="/dev-library" class="quick-btn">
                <lucide-icon name="code" [size]="22" [strokeWidth]="2"></lucide-icon>
                <span>Dev Library</span>
              </a>
              <a routerLink="/cyber-toolbox" class="quick-btn">
                <lucide-icon name="wrench" [size]="22" [strokeWidth]="2"></lucide-icon>
                <span>Cyber Toolbox</span>
              </a>
              <a routerLink="/secure-bridge" class="quick-btn">
                <lucide-icon name="send" [size]="22" [strokeWidth]="2"></lucide-icon>
                <span>Secure Bridge</span>
              </a>
              <a routerLink="/it-tools" class="quick-btn">
                <lucide-icon name="hammer" [size]="22" [strokeWidth]="2"></lucide-icon>
                <span>IT Tools</span>
              </a>
              <a routerLink="/teams" class="quick-btn">
                <lucide-icon name="users" [size]="22" [strokeWidth]="2"></lucide-icon>
                <span>Teams</span>
              </a>
              <a routerLink="/settings" class="quick-btn">
                <lucide-icon name="shield" [size]="22" [strokeWidth]="2"></lucide-icon>
                <span>Settings</span>
              </a>
            </div>
          </div>
        </div>
      } @else {
        <!-- Guest view -->
        <div class="guest-section">
          <div class="guest-card">
            <lucide-icon name="shield" [size]="40" [strokeWidth]="1.5" class="guest-icon"></lucide-icon>
            <h2 class="guest-title">Welcome to DevSec Vault</h2>
            <p class="guest-text">
              A secure platform for cybersecurity professionals. Log in to access your personal
              dev library, payloads, secure transfers, and more.
            </p>
            <div class="quick-grid" style="margin-top: 1.5rem">
              <a routerLink="/dev-library" class="quick-btn">
                <lucide-icon name="code" [size]="22" [strokeWidth]="2"></lucide-icon>
                <span>Dev Library</span>
              </a>
              <a routerLink="/it-tools" class="quick-btn">
                <lucide-icon name="hammer" [size]="22" [strokeWidth]="2"></lucide-icon>
                <span>IT Tools</span>
              </a>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 1rem 0; }
    .page-header { margin-bottom: 1.5rem; }
    .page-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--foreground);
      margin-bottom: 0.25rem;
    }
    .page-subtitle {
      font-size: 0.875rem;
      color: var(--muted-foreground);
    }

    /* Stats grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .stat-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .stat-icon {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .stat-icon-primary {
      background: color-mix(in srgb, var(--primary) 15%, transparent);
      color: var(--primary);
    }
    .stat-icon-accent {
      background: color-mix(in srgb, var(--accent) 15%, transparent);
      color: var(--accent);
    }
    .stat-icon-destructive {
      background: color-mix(in srgb, var(--destructive) 15%, transparent);
      color: var(--destructive);
    }
    .stat-info {
      display: flex;
      flex-direction: column;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--foreground);
      line-height: 1;
    }
    .stat-label {
      font-size: 0.75rem;
      color: var(--muted-foreground);
      margin-top: 0.25rem;
    }

    /* Content grid */
    .content-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 900px) {
      .content-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
      .stat-card { padding: 1rem; gap: 0.75rem; }
      .stat-value { font-size: 1.25rem; }
      .section-card { padding: 1rem; }
      .quick-grid { grid-template-columns: repeat(3, 1fr); }
      .quick-btn { padding: 0.75rem 0.375rem; font-size: 0.6875rem; }
    }
    @media (max-width: 480px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .quick-grid { grid-template-columns: repeat(2, 1fr); }
    }

    .section-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.25rem;
    }
    .section-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--foreground);
      margin-bottom: 1rem;
    }
    .section-title {
      font-size: 0.9375rem;
      font-weight: 600;
    }

    /* Activity */
    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    .activity-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.625rem;
      border-radius: calc(var(--radius) - 2px);
      cursor: pointer;
      transition: background-color 0.15s ease;
    }
    .activity-item:hover {
      background: var(--secondary);
    }
    .activity-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .dot-concept { background: var(--primary); }
    .dot-payload { background: var(--accent); }
    .activity-content {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      min-width: 0;
    }
    .activity-action { color: var(--muted-foreground); }
    .activity-title {
      color: var(--foreground);
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .activity-type {
      font-size: 0.6875rem;
      padding: 0.0625rem 0.375rem;
      border-radius: 0.25rem;
      background: var(--secondary);
      color: var(--muted-foreground);
      flex-shrink: 0;
    }
    .activity-time {
      font-size: 0.75rem;
      color: var(--muted-foreground);
      white-space: nowrap;
      flex-shrink: 0;
    }
    .empty-text {
      font-size: 0.8125rem;
      color: var(--muted-foreground);
      text-align: center;
      padding: 2rem 0;
    }

    /* Quick Access */
    .quick-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
    }
    .quick-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem 0.5rem;
      background: var(--secondary);
      border-radius: var(--radius);
      color: var(--foreground);
      text-decoration: none;
      font-size: 0.75rem;
      font-weight: 500;
      transition: background-color 0.15s ease, color 0.15s ease;
    }
    .quick-btn:hover {
      background: var(--primary);
      color: var(--primary-foreground);
    }

    /* Guest */
    .guest-section {
      display: flex;
      justify-content: center;
      padding: 3rem 0;
    }
    .guest-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 2.5rem;
      text-align: center;
      max-width: 32rem;
    }
    .guest-icon { color: var(--primary); margin-bottom: 1rem; }
    .guest-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--foreground);
      margin-bottom: 0.5rem;
    }
    .guest-text {
      font-size: 0.875rem;
      color: var(--muted-foreground);
      line-height: 1.6;
    }
  `],
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  readonly isAuthenticated = toSignal(this.auth.isAuthenticated$, { initialValue: false });
  readonly data = signal<DashboardData | null>(null);

  ngOnInit(): void {
    this.seo.apply({
      title: 'Tableau de bord',
      description: 'Tableau de bord DevSecVault : vos statistiques, activité récente et accès rapide aux modules Dev Library, Cyber Toolbox et Secure Bridge.',
      noindex: true,
    });
    if (this.isAuthenticated()) {
      this.loadDashboard();
    }
    // Also react to deferred auth
    const sub = this.auth.isAuthenticated$.subscribe((authed: boolean) => {
      if (authed && !this.data()) {
        this.loadDashboard();
        sub.unsubscribe();
      }
    });
  }

  private loadDashboard(): void {
    this.dashboardService.getDashboard().subscribe({
      next: d => this.data.set(d),
      error: () => {/* guest or network issue — leave null */},
    });
  }

  navigateToItem(item: ActivityItem): void {
    if (item.type === 'concept') {
      this.router.navigate(['/dev-library'], { queryParams: { concept: item.id } });
    } else {
      this.router.navigate(['/cyber-toolbox'], { queryParams: { payload: item.id } });
    }
  }

  formatTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}
