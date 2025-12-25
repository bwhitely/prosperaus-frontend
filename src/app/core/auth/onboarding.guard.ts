import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { ProfileService } from '../services/profile.service';
import { AuthService } from './auth.service';

/**
 * Guard that checks if the user has completed onboarding.
 * Redirects to /onboarding if not completed.
 */
export const onboardingGuard: CanActivateFn = (route, state) => {
  const profileService = inject(ProfileService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // If not authenticated, let the auth guard handle it
  if (!authService.isAuthenticated()) {
    return true;
  }

  return profileService.getOnboardingStatus().pipe(
    map(status => {
      if (status.completed) {
        return true;
      }
      return router.createUrlTree(['/onboarding']);
    }),
    catchError(() => {
      // If we can't check status, allow access (profile might not exist yet)
      return of(true);
    })
  );
};

/**
 * Guard that redirects away from onboarding if already completed.
 */
export const incompleteOnboardingGuard: CanActivateFn = (route, state) => {
  const profileService = inject(ProfileService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // If not authenticated, let the auth guard handle it
  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  return profileService.getOnboardingStatus().pipe(
    map(status => {
      if (!status.completed) {
        return true;
      }
      return router.createUrlTree(['/dashboard']);
    }),
    catchError(() => {
      // If we can't check, allow access to onboarding
      return of(true);
    })
  );
};
