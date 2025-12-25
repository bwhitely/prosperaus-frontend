import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth to initialize
  while (authService.isLoading()) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  if (authService.isAuthenticated()) {
    return true;
  }

  // Store the attempted URL for redirecting after login
  router.navigate(['/auth/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};

export const publicGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth to initialize
  while (authService.isLoading()) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  if (!authService.isAuthenticated()) {
    return true;
  }

  // Already authenticated, redirect to dashboard
  router.navigate(['/dashboard']);
  return false;
};
