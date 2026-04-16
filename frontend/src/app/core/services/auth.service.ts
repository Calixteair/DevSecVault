import { Injectable, inject, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { combineLatest, map } from 'rxjs';

/**
 * Key used to stash the URL (path + search + fragment) the user was on when
 * they hit "Log in". After Keycloak returns to the app, we read this back and
 * navigate them to where they intended to go (e.g. a /secret/:id#key link).
 */
const RETURN_URL_STORAGE_KEY = 'dsv.auth.returnUrl';

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

  /**
   * Trigger Keycloak login. If `returnUrl` is provided (or omitted, in which
   * case we capture the current location), the URL is stashed in
   * sessionStorage so the app can restore it after the OIDC round-trip.
   * Keycloak always redirects back to the static `redirectUrl` configured in
   * `provideAuth`; the fragment/path of the original page would otherwise be
   * lost.
   */
  login(returnUrl?: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const target = returnUrl ?? window.location.pathname + window.location.search + window.location.hash;
      // Only stash in-app paths — avoids sending the user back to the OIDC
      // callback page or to an external URL after login.
      if (target && target.startsWith('/') && !target.startsWith('//')) {
        sessionStorage.setItem(RETURN_URL_STORAGE_KEY, target);
      }
    } catch {
      // sessionStorage can throw in private modes — fall through without return URL.
    }
    this.oidc.authorize();
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.oidc.logoff().subscribe();
    }
  }

  checkAuth() {
    return this.oidc.checkAuth();
  }

  /** Pop the stashed post-login return URL, if any. Consumed exactly once. */
  consumeReturnUrl(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const url = sessionStorage.getItem(RETURN_URL_STORAGE_KEY);
      if (url) sessionStorage.removeItem(RETURN_URL_STORAGE_KEY);
      return url;
    } catch {
      return null;
    }
  }
}
