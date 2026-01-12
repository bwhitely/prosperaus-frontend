import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FREE_ACCESS_MODE } from '../auth/subscription.guard';

export type SubscriptionStatus =
  | 'FREE'
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'UNPAID'
  | 'INCOMPLETE'
  | 'INCOMPLETE_EXPIRED';

export interface Subscription {
  status: SubscriptionStatus;
  plan: string | null;
  isActive: boolean;
  isPro: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface SubscriptionStatusResponse {
  isActive: boolean;
}

export interface CheckoutResponse {
  url: string;
}

export interface PortalResponse {
  url: string;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/subscription`;

  private subscriptionState = signal<Subscription | null>(null);
  private loadingState = signal(false);

  subscription = this.subscriptionState.asReadonly();
  isLoading = this.loadingState.asReadonly();

  // In FREE_ACCESS_MODE, everyone is treated as Pro
  isPro = computed(() => FREE_ACCESS_MODE || (this.subscriptionState()?.isPro ?? false));
  isActive = computed(() => FREE_ACCESS_MODE || (this.subscriptionState()?.isActive ?? false));
  isFree = computed(() => !FREE_ACCESS_MODE && !this.isActive());

  /**
   * Get the current user's subscription details.
   */
  getSubscription(): Observable<Subscription> {
    this.loadingState.set(true);
    return this.http.get<Subscription>(this.apiUrl).pipe(
      tap({
        next: (subscription) => {
          this.subscriptionState.set(subscription);
          this.loadingState.set(false);
        },
        error: () => this.loadingState.set(false)
      })
    );
  }

  /**
   * Check if user has an active subscription (quick status check).
   */
  checkStatus(): Observable<SubscriptionStatusResponse> {
    return this.http.get<SubscriptionStatusResponse>(`${this.apiUrl}/status`);
  }

  /**
   * Create a Stripe Checkout session and redirect to payment.
   * @param plan 'monthly' or 'yearly'
   */
  createCheckoutSession(plan: 'monthly' | 'yearly' = 'monthly'): Observable<CheckoutResponse> {
    this.loadingState.set(true);
    return this.http.post<CheckoutResponse>(`${this.apiUrl}/checkout?plan=${plan}`, {}).pipe(
      tap({
        next: (response) => {
          this.loadingState.set(false);
          // Redirect to Stripe Checkout
          window.location.href = response.url;
        },
        error: () => this.loadingState.set(false)
      })
    );
  }

  /**
   * Create a Stripe Customer Portal session and redirect to manage subscription.
   */
  openCustomerPortal(): Observable<PortalResponse> {
    this.loadingState.set(true);
    return this.http.post<PortalResponse>(`${this.apiUrl}/portal`, {}).pipe(
      tap({
        next: (response) => {
          this.loadingState.set(false);
          // Redirect to Stripe Customer Portal
          window.location.href = response.url;
        },
        error: () => this.loadingState.set(false)
      })
    );
  }

  /**
   * Clear subscription state (e.g., on logout).
   */
  clearSubscription(): void {
    this.subscriptionState.set(null);
  }

  /**
   * Refresh subscription after returning from Stripe.
   */
  refreshSubscription(): void {
    this.getSubscription().subscribe();
  }
}
