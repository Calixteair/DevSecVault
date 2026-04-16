import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ConfirmDialogComponent],
  template: `
    <router-outlet />
    <app-confirm-dialog />
  `,
})
export class App implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.auth.checkAuth().subscribe(result => {
        // After a successful Keycloak round-trip, restore the URL the user was
        // on when they clicked "Log in" (e.g. a /secret/:id#key link). We use
        // location.replace (not Router.navigateByUrl) because the fragment
        // must survive — Angular Router drops URL fragments on programmatic
        // navigation unless explicitly re-attached.
        if (!result?.isAuthenticated) return;
        const returnUrl = this.auth.consumeReturnUrl();
        if (returnUrl && returnUrl !== window.location.pathname + window.location.search + window.location.hash) {
          window.location.replace(returnUrl);
        }
      });
    }
  }
}
