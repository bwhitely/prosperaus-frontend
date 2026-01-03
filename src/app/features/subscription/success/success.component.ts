import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SubscriptionService } from '../../../core/services/subscription.service';

@Component({
  selector: 'app-subscription-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="success">
      <div class="success__card">
        <div class="success__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>

        <h1 class="success__title">Welcome to Pro!</h1>
        <p class="success__message">
          Your subscription is now active. You have full access to all premium features.
        </p>

        <div class="success__features">
          <h3>You now have access to:</h3>
          <ul>
            <li>Net Worth Dashboard with history tracking</li>
            <li>Portfolio Analyser with MER & allocation insights</li>
            <li>AI-powered Bank Statement Analysis</li>
            <li>CGT Helper for tax optimisation</li>
            <li>Dividend & Distribution Tracker</li>
            <li>Save and compare multiple scenarios</li>
          </ul>
        </div>

        <div class="success__actions">
          <a routerLink="/dashboard" class="btn btn--primary">Go to Dashboard</a>
          <a routerLink="/profile" class="btn btn--secondary">View Profile</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @use '../../../../styles/variables' as *;

    .success {
      min-height: 80vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: $spacing-xl;
    }

    .success__card {
      background: $color-surface;
      border: 1px solid $color-border;
      border-radius: $radius-xl;
      padding: $spacing-3xl;
      max-width: 500px;
      text-align: center;
      box-shadow: $shadow-lg;
    }

    .success__icon {
      width: 72px;
      height: 72px;
      margin: 0 auto $spacing-lg;
      background: $color-positive-muted;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;

      svg {
        width: 40px;
        height: 40px;
        color: $color-positive;
      }
    }

    .success__title {
      font-size: $font-size-3xl;
      font-weight: $font-weight-bold;
      color: $color-text-primary;
      margin-bottom: $spacing-md;
    }

    .success__message {
      font-size: $font-size-lg;
      color: $color-text-secondary;
      margin-bottom: $spacing-xl;
      line-height: $line-height-relaxed;
    }

    .success__features {
      background: $color-surface-alt;
      border-radius: $radius-lg;
      padding: $spacing-lg;
      margin-bottom: $spacing-xl;
      text-align: left;

      h3 {
        font-size: $font-size-sm;
        font-weight: $font-weight-semibold;
        color: $color-text-primary;
        margin-bottom: $spacing-md;
      }

      ul {
        list-style: none;
        padding: 0;
        margin: 0;

        li {
          font-size: $font-size-sm;
          color: $color-text-secondary;
          padding: $spacing-xs 0;
          padding-left: $spacing-lg;
          position: relative;

          &::before {
            content: '✓';
            position: absolute;
            left: 0;
            color: $color-positive;
            font-weight: $font-weight-bold;
          }
        }
      }
    }

    .success__actions {
      display: flex;
      flex-direction: column;
      gap: $spacing-sm;

      .btn {
        display: block;
        padding: $spacing-md $spacing-lg;
        border-radius: $radius-lg;
        font-size: $font-size-base;
        font-weight: $font-weight-semibold;
        text-decoration: none;
        text-align: center;
        transition: all 0.2s ease;

        &--primary {
          background: $gradient-primary;
          color: $color-text-inverse;
          border: none;

          &:hover {
            opacity: 0.9;
          }
        }

        &--secondary {
          background: $color-surface;
          color: $color-text-primary;
          border: 1px solid $color-border;

          &:hover {
            background: $color-surface-hover;
          }
        }
      }
    }
  `]
})
export class SubscriptionSuccessComponent implements OnInit {
  private subscriptionService = inject(SubscriptionService);
  private router = inject(Router);

  ngOnInit(): void {
    // Refresh subscription status after successful checkout
    this.subscriptionService.refreshSubscription();
  }
}
