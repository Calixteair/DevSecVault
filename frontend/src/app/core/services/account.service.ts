import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Self-service account deletion (RGPD).
 *
 * Flow:
 *  1. `deleteLocalData()` cascades all DSV-side data (concepts, payloads,
 *     vault, secret links, API tokens, team memberships, owned teams) and
 *     deletes the user row. Reports made by the user are kept with
 *     reporter_id=NULL (LCEN evidence).
 *  2. `keycloakDeleteAccountUrl()` returns the URL the caller must navigate
 *     to so Keycloak runs its `delete_account` required action — the user
 *     consents on Keycloak's own page, the account is removed there, and the
 *     session is terminated.
 *
 * The two steps are split because the user must finish on Keycloak's side
 * (no service-account credentials live in the backend, by design).
 */
@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);

  /** Cascades & deletes the local DSV account. Returns 204 on success. */
  deleteLocalData() {
    return this.http.request<void>('DELETE', `${environment.apiUrl}/users/me`, {
      body: { confirm: 'DELETE' },
    });
  }

  /**
   * URL that triggers Keycloak's `delete_account` required action. The user
   * lands on a Keycloak-hosted confirmation page; on confirmation, the
   * account is deleted and the session ends. The browser is redirected to
   * `postLogoutRedirectUri`.
   */
  keycloakDeleteAccountUrl(): string {
    const kc = environment.keycloak;
    const authority = kc.authority.replace(/\/$/, '');
    const params = new URLSearchParams({
      client_id: kc.clientId,
      response_type: 'code',
      scope: 'openid',
      redirect_uri: kc.postLogoutRedirectUri,
      kc_action: 'delete_account',
    });
    return `${authority}/protocol/openid-connect/auth?${params.toString()}`;
  }
}
