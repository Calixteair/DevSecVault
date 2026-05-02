import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import {
  LUCIDE_ICONS,
  LucideAngularModule,
  LucideIconProvider,
  AlertTriangle,
  Check,
  Lock,
  Shield,
  Users,
} from 'lucide-angular';
import { TeamService } from '../../core/services/team.service';
import { AuthService } from '../../core/services/auth.service';
import { TeamSummary } from '../../core/models/team.model';
import { FooterComponent } from '../../layout/footer/footer.component';

const icons = { AlertTriangle, Check, Lock, Shield, Users };

type InviteState =
  | { kind: 'loading' }
  | { kind: 'login-required' }
  | { kind: 'accepting' }
  | { kind: 'success'; team: TeamSummary }
  | { kind: 'error'; message: string };

@Component({
  selector: 'app-invite-landing',
  standalone: true,
  imports: [LucideAngularModule, FooterComponent],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  template: `
    <div class="invite-shell">
      <div class="invite-panel">
        <div class="panel-icon">
          <lucide-icon name="users" [size]="28" [strokeWidth]="2"></lucide-icon>
        </div>

        @switch (state().kind) {
          @case ('loading') {
            <h1 class="panel-title">JOIN A TEAM</h1>
            <p class="panel-subtitle">Checking invite…</p>
            <div class="spinner" aria-hidden="true"></div>
          }

          @case ('login-required') {
            <h1 class="panel-title">JOIN A TEAM</h1>
            <p class="panel-subtitle">You've been invited to collaborate on DevSecVault.</p>
            <div class="info-banner">
              <lucide-icon name="lock" [size]="18"></lucide-icon>
              <div>
                <strong>Login required</strong>
                <p>You need a DevSecVault account to accept this invitation. We'll bring you right back here after login.</p>
              </div>
            </div>
            <button type="button" class="btn btn-primary" (click)="loginAndReturn()">
              <lucide-icon name="lock" [size]="16" [strokeWidth]="2"></lucide-icon>
              Log in to accept
            </button>
          }

          @case ('accepting') {
            <h1 class="panel-title">JOINING TEAM</h1>
            <p class="panel-subtitle">Hold on — we're adding you to the team.</p>
            <div class="spinner" aria-hidden="true"></div>
          }

          @case ('success') {
            <h1 class="panel-title">WELCOME ABOARD</h1>
            <p class="panel-subtitle">
              You're now a member of <strong class="team-name">{{ successTeam()?.name }}</strong>.
            </p>
            <div class="success-banner">
              <lucide-icon name="check" [size]="18"></lucide-icon>
              <div>
                <strong>Invitation accepted</strong>
                <p>You can now see resources shared with this team.</p>
              </div>
            </div>
            <button type="button" class="btn btn-primary" (click)="goToTeams()">
              <lucide-icon name="users" [size]="16" [strokeWidth]="2"></lucide-icon>
              Go to team
            </button>
          }

          @case ('error') {
            <h1 class="panel-title">INVITE UNAVAILABLE</h1>
            <p class="panel-subtitle">This invitation cannot be accepted.</p>
            <div class="alert-banner">
              <lucide-icon name="alert-triangle" [size]="18"></lucide-icon>
              <div>
                <strong>Something went wrong</strong>
                <p>{{ errorMessage() }}</p>
              </div>
            </div>
            <button type="button" class="btn btn-ghost" (click)="goToDashboard()">
              Back to dashboard
            </button>
          }
        }

        <footer class="panel-footer font-mono">
          <lucide-icon name="shield" [size]="12" [strokeWidth]="2"></lucide-icon>
          DevSecVault · Team Invite
        </footer>
      </div>
      <app-footer />
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: radial-gradient(
        1200px 600px at 50% -10%,
        color-mix(in srgb, var(--primary) 18%, transparent),
        transparent 70%
      ), var(--background);
    }
    .invite-shell {
      min-height: 100vh;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 2rem 1.25rem 0;
      gap: 2rem;
    }
    .invite-shell app-footer { width: 100%; align-self: stretch; }
    .invite-panel {
      width: 100%; max-width: 480px;
      background: var(--card);
      border: 2px solid color-mix(in srgb, var(--primary) 40%, var(--border));
      border-radius: var(--radius);
      padding: 2rem 1.75rem 1.25rem;
      display: flex; flex-direction: column; align-items: center; gap: 0.875rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45);
    }
    .panel-icon {
      width: 56px; height: 56px; border-radius: 999px;
      background: color-mix(in srgb, var(--primary) 14%, transparent);
      color: var(--primary);
      display: flex; align-items: center; justify-content: center;
      border: 1px solid color-mix(in srgb, var(--primary) 40%, transparent);
    }
    .panel-title {
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: 0.15em;
      color: var(--primary);
      font-size: 1.125rem; font-weight: 700; margin: 0;
    }
    .panel-subtitle {
      margin: 0; font-size: 0.875rem; color: var(--muted-foreground); text-align: center;
    }
    .team-name { color: var(--foreground); font-weight: 600; }

    .info-banner, .success-banner, .alert-banner {
      display: flex; align-items: flex-start; gap: 0.75rem;
      padding: 0.875rem 1rem;
      border-radius: var(--radius);
      width: 100%; box-sizing: border-box;
    }
    .info-banner {
      background: color-mix(in srgb, var(--primary) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--primary) 35%, transparent);
      color: var(--primary);
    }
    .success-banner {
      background: color-mix(in srgb, var(--primary) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--primary) 35%, transparent);
      color: var(--primary);
    }
    .alert-banner {
      background: color-mix(in srgb, var(--destructive) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--destructive) 35%, transparent);
      color: var(--destructive);
    }
    .info-banner strong, .success-banner strong, .alert-banner strong { display: block; font-size: 0.875rem; }
    .info-banner p, .success-banner p, .alert-banner p {
      margin: 0.25rem 0 0;
      color: var(--muted-foreground); font-size: 0.8125rem;
    }

    .btn {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.625rem 1rem;
      font-size: 0.875rem; font-weight: 500;
      border-radius: var(--radius); border: 1px solid transparent;
      cursor: pointer; transition: all 0.15s;
    }
    .btn-primary {
      background: var(--primary); color: var(--primary-foreground); border-color: var(--primary);
    }
    .btn-primary:hover { background: color-mix(in srgb, var(--primary) 88%, black); }
    .btn-ghost {
      background: transparent; color: var(--foreground); border-color: var(--border);
    }
    .btn-ghost:hover { background: var(--secondary); }

    .spinner {
      width: 28px; height: 28px;
      border: 2px solid color-mix(in srgb, var(--primary) 25%, transparent);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.9s linear infinite;
      margin: 0.5rem auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .panel-footer {
      margin-top: 0.5rem;
      display: inline-flex; align-items: center; gap: 0.375rem;
      color: var(--muted-foreground);
      font-size: 0.6875rem; letter-spacing: 0.08em; text-transform: uppercase;
    }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  `],
})
export class InviteLandingComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teamService = inject(TeamService);
  private readonly auth = inject(AuthService);

  readonly state = signal<InviteState>({ kind: 'loading' });
  private readonly accepted = signal(false);
  private token = '';
  private authSub: Subscription | null = null;

  readonly successTeam = () => {
    const s = this.state();
    return s.kind === 'success' ? s.team : null;
  };

  readonly errorMessage = () => {
    const s = this.state();
    return s.kind === 'error' ? s.message : '';
  };

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.state.set({ kind: 'error', message: 'This invite URL is malformed — no token provided.' });
      return;
    }

    // Watch auth status. If already authenticated → auto-accept.
    // Otherwise show the login-required CTA.
    this.authSub = this.auth.isAuthenticated$.subscribe(authed => {
      if (authed) {
        this.tryAccept();
      } else if (this.state().kind === 'loading') {
        this.state.set({ kind: 'login-required' });
      }
    });
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
  }

  /** Fires exactly once per page load. */
  private tryAccept(): void {
    if (this.accepted()) return;
    this.accepted.set(true);

    this.state.set({ kind: 'accepting' });
    this.teamService.acceptInvite(this.token).subscribe({
      next: team => this.state.set({ kind: 'success', team }),
      error: (err: HttpErrorResponse) => {
        this.state.set({ kind: 'error', message: this.describeError(err) });
      },
    });
  }

  loginAndReturn(): void {
    // Stash the full invite URL (path + search + fragment) so the user comes
    // straight back here after the Keycloak round-trip — app.ts will consume
    // the return URL and `window.location.replace` us back.
    const current = window.location.pathname + window.location.search + window.location.hash;
    this.auth.login(current);
  }

  goToTeams(): void {
    void this.router.navigate(['/teams']);
  }

  goToDashboard(): void {
    void this.router.navigate(['/']);
  }

  private describeError(err: HttpErrorResponse): string {
    if (err.status === 0) return 'Network error — is the API reachable?';
    if (err.status === 404) return 'This invitation link is unknown or has been deleted.';
    if (err.status === 410) return 'This invitation has expired, been revoked, or already used.';
    if (err.status === 409) {
      const msg = this.extractServerMessage(err);
      if (msg) return msg;
      return 'This team is full or you already have too many teams.';
    }
    if (err.status === 401 || err.status === 403) {
      return 'You are not allowed to accept this invitation.';
    }
    const msg = this.extractServerMessage(err);
    if (msg) return msg;
    return `HTTP ${err.status} — ${err.statusText || 'request failed'}`;
  }

  private extractServerMessage(err: HttpErrorResponse): string | null {
    const body = err.error;
    if (body && typeof body === 'object') {
      if ('error' in body) return String((body as { error: unknown }).error);
      if ('message' in body) return String((body as { message: unknown }).message);
    }
    return null;
  }
}
