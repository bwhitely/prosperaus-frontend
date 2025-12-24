import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component')
      .then(m => m.DashboardComponent),
    title: 'Dashboard - AusFinance'
  },
  {
    path: 'equity-recycling',
    loadComponent: () => import('./features/equity-recycling/equity-recycling.component')
      .then(m => m.EquityRecyclingComponent),
    title: 'Equity Recycling Calculator - AusFinance'
  },
  {
    path: 'fire-calculator',
    loadComponent: () => import('./features/fire-calculator/fire-calculator.component')
      .then(m => m.FireCalculatorComponent),
    title: 'FIRE Calculator - AusFinance'
  },
  {
    path: 'super-optimiser',
    loadComponent: () => import('./features/super-optimiser/super-optimiser.component')
      .then(m => m.SuperOptimiserComponent),
    title: 'Super Optimiser - AusFinance'
  },
  {
    path: 'property-analyser',
    loadComponent: () => import('./features/property-analyser/property-analyser.component')
      .then(m => m.PropertyAnalyserComponent),
    title: 'Property Analyser - AusFinance'
  },
  {
    path: 'portfolio',
    loadComponent: () => import('./features/portfolio-analyser/portfolio-analyser.component')
      .then(m => m.PortfolioAnalyserComponent),
    title: 'Portfolio Analyser - AusFinance'
  },
  {
    path: 'analyse',
    loadComponent: () => import('./features/statement-analyser/statement-analyser.component')
      .then(m => m.StatementAnalyserComponent),
    title: 'Statement Analyser - AusFinance'
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile.component')
      .then(m => m.ProfileComponent),
    title: 'Profile - AusFinance'
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
