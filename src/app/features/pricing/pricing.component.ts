import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SubscriptionService } from '../../core/services/subscription.service';
import { AuthService } from '../../core/auth/auth.service';

interface PlanFeature {
  name: string;
  free: boolean;
  pro: boolean;
}

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss'
})
export class PricingComponent {
  private subscriptionService = inject(SubscriptionService);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal(false);
  isLoggedIn = this.authService.isAuthenticated;
  isPro = this.subscriptionService.isPro;

  features: PlanFeature[] = [
    { name: 'Equity Recycling Calculator', free: true, pro: true },
    { name: 'FIRE Calculator', free: true, pro: true },
    { name: 'Super Optimiser', free: true, pro: true },
    { name: 'Property Analyser', free: true, pro: true },
    { name: 'Mortgage Calculator', free: true, pro: true },
    { name: 'Net Worth Dashboard', free: false, pro: true },
    { name: 'Portfolio Analyser', free: false, pro: true },
    { name: 'Bank Statement Analyser (AI)', free: false, pro: true },
    { name: 'Net Worth Projections', free: false, pro: true },
    { name: 'CGT Helper', free: false, pro: true },
    { name: 'Dividend Tracker', free: false, pro: true },
    { name: 'Save & Compare Scenarios', free: false, pro: true },
    { name: 'Monthly Net Worth Snapshots', free: false, pro: true },
    { name: 'Data Export (CSV)', free: false, pro: true },
  ];

  subscribe(): void {
    if (!this.isLoggedIn()) {
      // Redirect to login with return URL
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: '/pricing' }
      });
      return;
    }

    this.isLoading.set(true);
    this.subscriptionService.createCheckoutSession().subscribe({
      error: (err) => {
        console.error('Failed to create checkout session:', err);
        this.isLoading.set(false);
      }
    });
  }

  manageSubscription(): void {
    this.isLoading.set(true);
    this.subscriptionService.openCustomerPortal().subscribe({
      error: (err) => {
        console.error('Failed to open customer portal:', err);
        this.isLoading.set(false);
      }
    });
  }
}
