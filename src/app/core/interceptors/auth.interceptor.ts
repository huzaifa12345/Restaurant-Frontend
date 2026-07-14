import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getAccessToken();
  const isAuthEndpoint = req.url.includes('/auth/login') || req.url.includes('/auth/refresh-token');

  const authReq = token && !isAuthEndpoint
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthEndpoint || req.url.includes('/auth/refresh-token')) {
        return throwError(() => error);
      }

      return auth.refreshToken().pipe(
        switchMap(response => {
          const retry = req.clone({
            setHeaders: { Authorization: `Bearer ${response.accessToken}` }
          });
          return next(retry);
        }),
        catchError(refreshError => {
          auth.logout();
          return throwError(() => refreshError);
        })
      );
    })
  );
};
