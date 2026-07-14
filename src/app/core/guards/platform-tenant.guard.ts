import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Only the platform restaurant (code DEMO001) may open tenant management. */
export const platformTenantGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isPlatformRestaurant() && auth.hasAnyPermission(['Restaurants.View', 'Restaurants.Create'])) {
    return true;
  }

  return router.createUrlTree(['/app/dashboard']);
};
