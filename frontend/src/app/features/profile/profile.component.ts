import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  User,
  Mail,
  Shield,
  Crown,
  Users,
  Calendar,
  Code,
  Wrench,
  Send,
  ExternalLink,
} from 'lucide-angular';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { UserProfile } from '../../core/models/dashboard.model';
import { DashboardData } from '../../core/models/dashboard.model';

const icons = { User, Mail, Shield, Crown, Users, Calendar, Code, Wrench, Send, ExternalLink };

@Component({
  selector: 'app-profile',
  imports: [LucideAngularModule, RouterLink],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <div class="page">
      <h1 class="page-title">Profile</h1>
      <p class="page-subtitle">Your account information</p>

      @if (profile()) {
        <div class="profile-grid">
          <!-- User Info Card -->
          <div class="card user-card">
            <div class="user-avatar">
              <lucide-icon name="user" [size]="32" [strokeWidth]="1.5"></lucide-icon>
            </div>
            <h2 class="user-name">{{ profile()!.username }}</h2>
            <span class="user-role-badge font-mono" [class]="'role-' + roleClass()">
              @if (profile()!.role === 'ROLE_ADMIN') {
                <lucide-icon name="shield" [size]="14" [strokeWidth]="2"></lucide-icon> Admin
              } @else {
                <lucide-icon name="user" [size]="14" [strokeWidth]="2"></lucide-icon> User
              }
            </span>

            <div class="info-list">
              <div class="info-row">
                <lucide-icon name="mail" [size]="14" [strokeWidth]="2" class="info-icon"></lucide-icon>
                <span class="info-value">{{ profile()!.email }}</span>
              </div>
              <div class="info-row">
                <lucide-icon name="calendar" [size]="14" [strokeWidth]="2" class="info-icon"></lucide-icon>
                <span class="info-value">Joined {{ formatDate(profile()!.createdAt) }}</span>
              </div>
            </div>
          </div>

          <!-- Stats Card -->
          <div class="card stats-card">
            <h3 class="card-title">Your Numbers</h3>
            <div class="mini-stats">
              <div class="mini-stat">
                <lucide-icon name="code" [size]="18" [strokeWidth]="2" class="mini-icon icon-primary"></lucide-icon>
                <span class="mini-value">{{ dashData()?.stats?.concepts ?? '—' }}</span>
                <span class="mini-label">Concepts</span>
              </div>
              <div class="mini-stat">
                <lucide-icon name="wrench" [size]="18" [strokeWidth]="2" class="mini-icon icon-accent"></lucide-icon>
                <span class="mini-value">{{ dashData()?.stats?.payloads ?? '—' }}</span>
                <span class="mini-label">Payloads</span>
              </div>
              <div class="mini-stat">
                <lucide-icon name="send" [size]="18" [strokeWidth]="2" class="mini-icon icon-destructive"></lucide-icon>
                <span class="mini-value">{{ dashData()?.stats?.secretLinks ?? '—' }}</span>
                <span class="mini-label">Transfers</span>
              </div>
              <div class="mini-stat">
                <lucide-icon name="users" [size]="18" [strokeWidth]="2" class="mini-icon icon-primary"></lucide-icon>
                <span class="mini-value">{{ dashData()?.stats?.teams ?? '—' }}</span>
                <span class="mini-label">Teams</span>
              </div>
            </div>
          </div>

          <!-- Teams Card -->
          <div class="card teams-card">
            <h3 class="card-title">
              <lucide-icon name="users" [size]="16" [strokeWidth]="2"></lucide-icon>
              Teams
            </h3>
            @if (profile()!.teams.length > 0) {
              <div class="teams-list">
                @for (team of profile()!.teams; track team.id) {
                  <a [routerLink]="['/teams', team.id]" class="team-row">
                    <span class="team-name">{{ team.name }}</span>
                    <lucide-icon name="external-link" [size]="14" [strokeWidth]="2" class="team-link-icon"></lucide-icon>
                  </a>
                }
              </div>
            } @else {
              <p class="empty-text">You're not part of any team yet.</p>
            }
          </div>
        </div>
      } @else {
        <div class="loading">Loading profile...</div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 1rem 0; }
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

    .profile-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 768px) {
      .profile-grid { grid-template-columns: 1fr; }
    }

    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.5rem;
    }
    .card-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--foreground);
      margin-bottom: 1rem;
    }

    /* User card */
    .user-card {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .user-avatar {
      width: 4rem;
      height: 4rem;
      border-radius: 50%;
      background: color-mix(in srgb, var(--primary) 15%, transparent);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.75rem;
    }
    .user-name {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--foreground);
      margin-bottom: 0.375rem;
    }
    .user-role-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      margin-bottom: 1rem;
    }
    .role-admin {
      background: color-mix(in srgb, var(--destructive) 15%, transparent);
      color: var(--destructive);
    }
    .role-user {
      background: color-mix(in srgb, var(--primary) 15%, transparent);
      color: var(--primary);
    }
    .info-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .info-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: var(--muted-foreground);
    }
    .info-icon { color: var(--muted-foreground); }
    .info-value { color: var(--foreground); }

    /* Mini stats */
    .mini-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    .mini-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      padding: 0.75rem;
      background: var(--secondary);
      border-radius: var(--radius);
    }
    .mini-icon { }
    .icon-primary { color: var(--primary); }
    .icon-accent { color: var(--accent); }
    .icon-destructive { color: var(--destructive); }
    .mini-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--foreground);
    }
    .mini-label {
      font-size: 0.6875rem;
      color: var(--muted-foreground);
    }

    /* Teams */
    .teams-card { }
    .teams-list { display: flex; flex-direction: column; gap: 0.25rem; }
    .team-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.625rem;
      border-radius: calc(var(--radius) - 2px);
      text-decoration: none;
      color: var(--foreground);
      font-size: 0.8125rem;
      transition: background-color 0.15s ease;
    }
    .team-row:hover { background: var(--secondary); }
    .team-name { font-weight: 500; }
    .team-link-icon { color: var(--muted-foreground); }

    .empty-text {
      font-size: 0.8125rem;
      color: var(--muted-foreground);
      text-align: center;
      padding: 1rem 0;
    }
    .loading {
      font-size: 0.875rem;
      color: var(--muted-foreground);
      text-align: center;
      padding: 3rem 0;
    }
  `],
})
export class ProfileComponent implements OnInit {
  private readonly dashService = inject(DashboardService);

  readonly profile = signal<UserProfile | null>(null);
  readonly dashData = signal<DashboardData | null>(null);

  ngOnInit(): void {
    this.dashService.getProfile().subscribe(p => this.profile.set(p));
    this.dashService.getDashboard().subscribe(d => this.dashData.set(d));
  }

  roleClass(): string {
    return this.profile()?.role === 'ROLE_ADMIN' ? 'admin' : 'user';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
