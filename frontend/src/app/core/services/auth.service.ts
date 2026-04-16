import { Injectable, inject, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { combineLatest, map } from 'rxjs';

export interface UserProfile {
  username: string;
  email: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly oidc = inject(OidcSecurityService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly isAuthenticated$ = this.oidc.isAuthenticated$.pipe(map(r => r.isAuthenticated));

  // Keycloak's /userinfo endpoint does not include realm_access.roles by default,
  // but the access token does. We combine the userinfo (username/email) with the
  // access token claims (roles) to build a complete user profile.
  readonly userData$ = combineLatest([
    this.oidc.userData$,
    this.oidc.getPayloadFromAccessToken(),
  ]).pipe(
    map(([r, tokenPayload]): UserProfile | null => {
      if (!r.userData) return null;
      const data = r.userData;
      const realmRoles: string[] = tokenPayload?.realm_access?.roles
        ?? data.realm_access?.roles
        ?? [];
      return {
        username: data.preferred_username ?? data.sub,
        email: data.email ?? '',
        roles: realmRoles,
      };
    })
  );

  readonly isAdmin$ = this.userData$.pipe(
    map((u): boolean => !!u && (u.roles.includes('admin') || u.roles.includes('ROLE_ADMIN')))
  );

  readonly accessToken$ = this.oidc.getAccessToken();

  login(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.oidc.authorize();
    }
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.oidc.logoff().subscribe();
    }
  }

  checkAuth() {
    return this.oidc.checkAuth();
  }
}
