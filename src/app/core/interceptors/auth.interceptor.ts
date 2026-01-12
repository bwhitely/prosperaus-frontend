import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap, catchError, throwError } from 'rxjs';
import { SupabaseService } from '../auth/supabase.service';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

// Public API endpoints that should NOT redirect to login on 401
// These are calculators accessible without authentication
const PUBLIC_API_PATHS = [
  '/fire/',
  '/mortgage-calculator/',
  '/equity-recycling/',
  '/super-optimiser/',
  '/property-analyser/'
];

function isPublicApiPath(url: string): boolean {
  const apiPath = url.replace(environment.apiBaseUrl, '');
  return PUBLIC_API_PATHS.some(path => apiPath.startsWith(path));
}

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const supabaseService = inject(SupabaseService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Only add auth header for API requests
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  const isPublic = isPublicApiPath(req.url);

  // Get fresh session (this triggers token refresh if needed)
  return from(supabaseService.getSession()).pipe(
    switchMap(session => {
      if (session?.access_token) {
        const clonedRequest = req.clone({
          setHeaders: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        return next(clonedRequest);
      }
      // No session, proceed without auth header
      return next(req);
    }),
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isPublic) {
        // Token is invalid for protected endpoint, sign out and redirect to login
        authService.signOut();
        router.navigate(['/auth/login']);
      }
      // For public endpoints, just pass the error through (component handles it)
      return throwError(() => error);
    })
  );
};
