import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './core/auth/auth.guard';
import { onboardingGuard, incompleteOnboardingGuard } from './core/auth/onboarding.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },

  // Auth routes (public only)
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component')
      .then(m => m.LoginComponent),
    canActivate: [publicGuard],
    title: 'Sign In - AusFinance'
  },
  {
    path: 'auth/signup',
    loadComponent: () => import('./features/auth/signup/signup.component')
      .then(m => m.SignupComponent),
    canActivate: [publicGuard],
    title: 'Create Account - AusFinance'
  },

  // Onboarding (requires auth, but only if not completed)
  {
    path: 'onboarding',
    loadComponent: () => import('./features/onboarding/onboarding.component')
      .then(m => m.OnboardingComponent),
    canActivate: [authGuard, incompleteOnboardingGuard],
    title: 'Get Started - AusFinance'
  },

  // Protected routes (require auth + completed onboarding)
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component')
      .then(m => m.DashboardComponent),
    canActivate: [authGuard, onboardingGuard],
    title: 'Dashboard - AusFinance'
  },
  {
    path: 'equity-recycling',
    loadComponent: () => import('./features/equity-recycling/equity-recycling.component')
      .then(m => m.EquityRecyclingComponent),
    canActivate: [authGuard, onboardingGuard],
    title: 'Equity Recycling Calculator - AusFinance'
  },
  {
    path: 'fire-calculator',
    loadComponent: () => import('./features/fire-calculator/fire-calculator.component')
      .then(m => m.FireCalculatorComponent),
    canActivate: [authGuard, onboardingGuard],
    title: 'FIRE Calculator - AusFinance'
  },
  {
    path: 'super-optimiser',
    loadComponent: () => import('./features/super-optimiser/super-optimiser.component')
      .then(m => m.SuperOptimiserComponent),
    canActivate: [authGuard, onboardingGuard],
    title: 'Super Optimiser - AusFinance'
  },
  {
    path: 'property-analyser',
    loadComponent: () => import('./features/property-analyser/property-analyser.component')
      .then(m => m.PropertyAnalyserComponent),
    canActivate: [authGuard, onboardingGuard],
    title: 'Property Analyser - AusFinance'
  },
  {
    path: 'portfolio',
    loadComponent: () => import('./features/portfolio-analyser/portfolio-analyser.component')
      .then(m => m.PortfolioAnalyserComponent),
    canActivate: [authGuard, onboardingGuard],
    title: 'Portfolio Analyser - AusFinance'
  },
  {
    path: 'analyse',
    loadComponent: () => import('./features/statement-analyser/statement-analyser.component')
      .then(m => m.StatementAnalyserComponent),
    canActivate: [authGuard, onboardingGuard],
    title: 'Statement Analyser - AusFinance'
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile.component')
      .then(m => m.ProfileComponent),
    canActivate: [authGuard, onboardingGuard],
    title: 'Profile - AusFinance'
  },

  // Asset Management Routes
  {
    path: 'properties',
    loadComponent: () => import('./features/properties/properties.component')
      .then(m => m.PropertiesComponent),
    canActivate: [authGuard, onboardingGuard],
    title: 'Properties - AusFinance'
  },
  {
    path: 'super',
    loadComponent: () => import('./features/super-accounts/super-accounts.component')
      .then(m => m.SuperAccountsComponent),
    canActivate: [authGuard, onboardingGuard],
    title: 'Super Accounts - AusFinance'
  },
  {
    path: 'investments',
    loadComponent: () => import('./features/investments/investments.component')
      .then(m => m.InvestmentsComponent),
    canActivate: [authGuard, onboardingGuard],
    title: 'Investments - AusFinance'
  },
  {
    path: 'cash',
    loadComponent: () => import('./features/cash-liabilities/cash-liabilities.component')
      .then(m => m.CashLiabilitiesComponent),
    canActivate: [authGuard, onboardingGuard],
    title: 'Cash & Liabilities - AusFinance'
  },
  {
    path: 'cash-flow',
    loadComponent: () => import('./features/cash-flow/cash-flow.component')
      .then(m => m.CashFlowComponent),
    canActivate: [authGuard, onboardingGuard],
    title: 'Cash Flow - AusFinance'
  },
  {
    path: 'projections',
    loadComponent: () => import('./features/projections/projections.component')
      .then(m => m.ProjectionsComponent),
    canActivate: [authGuard, onboardingGuard],
    title: 'Net Worth Projection - AusFinance'
  },
  {
    path: 'cgt',
    loadComponent: () => import('./features/cgt-helper/cgt-helper.component')
      .then(m => m.CgtHelperComponent),
    canActivate: [authGuard, onboardingGuard],
    title: 'CGT Helper - AusFinance'
  },
  {
    path: 'dividends',
    loadComponent: () => import('./features/dividends/dividends.component')
      .then(m => m.DividendsComponent),
    canActivate: [authGuard, onboardingGuard],
    title: 'Dividends & Distributions - AusFinance'
  },

  // Fallback
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
