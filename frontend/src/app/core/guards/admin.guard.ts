import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Route guard that only lets admins through. Non-admins (including guests) are
 * redirected to /dashboard. We rely on AuthService.isAdmin$ which reads the
 * realm roles from the access token (NOT /userinfo — see auth.service.ts).
 *
 * Backend enforces ROLE_ADMIN on every /api/admin/* endpoint, so this guard is
 * pure UX polish — hiding the page from non-admins avoids a 403 toast on an
 * otherwise useless view.
 */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAdmin$.pipe(
    take(1),
    map(isAdmin => isAdmin || router.createUrlTree(['/dashboard'])),
  );
};
