import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SubscriptionService } from '../services/subscription.service';
import { AuthService } from './auth.service';

/**
 * FEATURE FLAG: Set to true to bypass all subscription checks.
 * This makes all Pro features free until Basiq (OpenBanking) integration is complete.
 * TODO: Set to false when ready to enable paid subscriptions.
 */
export const FREE_ACCESS_MODE = true;

/**
 * Guard that requires an active Pro subscription.
 * Redirects to pricing page if user doesn't have Pro access.
 * Should be used after authGuard to ensure user is authenticated first.
 *
 * NOTE: Currently bypassed when FREE_ACCESS_MODE is true.
 */
export const paidFeatureGuard: CanActivateFn = async (route, state) => {
  // BYPASS: Free access mode - all features available without subscription
  if (FREE_ACCESS_MODE) {
    return true;
  }

  const subscriptionService = inject(SubscriptionService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth to initialize
  while (authService.isLoading()) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // If not authenticated, authGuard should have already handled this
  if (!authService.isAuthenticated()) {
    router.navigate(['/auth/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  // Wait for subscription to load if needed
  while (subscriptionService.isLoading()) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  if (subscriptionService.isPro()) {
    return true;
  }

  // Redirect to pricing page if not Pro
  router.navigate(['/pricing'], {
    queryParams: { feature: route.routeConfig?.path }
  });
  return false;
};

/**
 * Guard that allows access but tracks if user has Pro.
 * Useful for routes that show different content based on subscription.
 * Does not block access, just ensures subscription state is loaded.
 */
export const subscriptionAwareGuard: CanActivateFn = async () => {
  const subscriptionService = inject(SubscriptionService);
  const authService = inject(AuthService);

  // Wait for auth to initialize
  while (authService.isLoading()) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // If authenticated, ensure subscription is loaded
  if (authService.isAuthenticated()) {
    while (subscriptionService.isLoading()) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // Always allow access
  return true;
};
