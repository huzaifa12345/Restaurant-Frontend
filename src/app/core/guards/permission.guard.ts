import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const permissionGuard: CanActivateFn = route => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const required = route.data['permissions'] as string[] | undefined;

  if (!required || required.length === 0 || auth.hasAnyPermission(required)) {
    return true;
  }

  return router.createUrlTree(['/app/dashboard']);
};
