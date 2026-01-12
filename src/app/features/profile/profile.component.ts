import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  computed
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';

import { ProfileService, UserProfile, TaxResidency, ProfileUpdateRequest } from '../../core/services/profile.service';
import { NetWorthService } from '../../core/services/net-worth.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { FREE_ACCESS_MODE } from '../../core/auth/subscription.guard';
import { PropertyService } from '../../core/services/property.service';
import { SuperAccountService } from '../../core/services/super-account.service';
import { InvestmentService } from '../../core/services/investment.service';
import { CashLiabilityService } from '../../core/services/cash-liability.service';
import { CashFlowService } from '../../core/services/cash-flow.service';
import { NetWorthResponse } from '../../shared/models/net-worth.model';
import { PropertyResponse } from '../../shared/models/property.model';
import { SuperAccountResponse } from '../../shared/models/super-account.model';
import { InvestmentHoldingResponse } from '../../shared/models/investment.model';
import { CashAccountResponse, LiabilityResponse } from '../../shared/models/cash-liability.model';
import { CashFlowSummaryResponse } from '../../shared/models/cash-flow.model';

// Import child components for Income/Expenses tab
import { IncomeListComponent } from '../cash-flow/components/income-list/income-list.component';
import { ExpenseListComponent } from '../cash-flow/components/expense-list/expense-list.component';

type ProfileTab = 'personal' | 'income' | 'assets' | 'liabilities';
type AssetSection = 'properties' | 'super' | 'investments' | 'cash';
type LiabilitySection = 'mortgages' | 'creditCards' | 'personalLoans' | 'carLoans' | 'hecs' | 'other';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    CurrencyPipe,
    DatePipe,
    PercentPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatExpansionModule,
    IncomeListComponent,
    ExpenseListComponent
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private profileService = inject(ProfileService);
  private netWorthService = inject(NetWorthService);
  private propertyService = inject(PropertyService);
  private superAccountService = inject(SuperAccountService);
  private investmentService = inject(InvestmentService);
  private cashLiabilityService = inject(CashLiabilityService);
  private cashFlowService = inject(CashFlowService);
  private subscriptionService = inject(SubscriptionService);
  private snackBar = inject(MatSnackBar);

  // Tab state
  activeTab = signal<ProfileTab>('personal');

  // Profile data
  profile = signal<UserProfile | null>(null);
  isProfileLoading = signal(true);
  isSaving = signal(false);

  // Net worth data for Assets/Liabilities tabs
  netWorth = signal<NetWorthResponse | null>(null);
  isNetWorthLoading = signal(false);

  // Cash flow summary
  cashFlowSummary = signal<CashFlowSummaryResponse | null>(null);

  // Subscription state
  subscription = this.subscriptionService.subscription;
  isPro = this.subscriptionService.isPro;
  isSubscriptionLoading = signal(false);

  // Expandable sections state
  expandedAssetSections = signal<Set<AssetSection>>(new Set());
  expandedLiabilitySections = signal<Set<LiabilitySection>>(new Set());

  // Asset detail data (lazy loaded)
  properties = signal<PropertyResponse[]>([]);
  superAccounts = signal<SuperAccountResponse[]>([]);
  investments = signal<InvestmentHoldingResponse[]>([]);
  cashAccounts = signal<CashAccountResponse[]>([]);

  // Liability detail data (lazy loaded)
  liabilities = signal<LiabilityResponse[]>([]);

  // Loading states for sections
  sectionLoading = signal<Set<string>>(new Set());

  // Tax residency options
  taxResidencyOptions: { value: TaxResidency; label: string }[] = [
    { value: 'RESIDENT', label: 'Australian Resident' },
    { value: 'NON_RESIDENT', label: 'Non-Resident' },
    { value: 'WORKING_HOLIDAY', label: 'Working Holiday Maker' }
  ];

  // Marginal tax rate options (FY25-26)
  taxRateOptions: { value: number; label: string }[] = [
    { value: 0, label: '0% ($0 - $18,200)' },
    { value: 0.16, label: '16% ($18,201 - $45,000)' },
    { value: 0.30, label: '30% ($45,001 - $135,000)' },
    { value: 0.37, label: '37% ($135,001 - $190,000)' },
    { value: 0.45, label: '45% ($190,001+)' }
  ];

  // Personal details form
  personalForm: FormGroup = this.fb.group({
    displayName: ['', Validators.required],
    dateOfBirth: ['', Validators.required],
    taxResidency: ['RESIDENT', Validators.required],
    marginalTaxRate: [0.30],
    hasPrivateHealthInsurance: [false],
    retirementAge: [67, [Validators.required, Validators.min(55), Validators.max(100)]]
  });

  // Computed values
  currentAge = computed(() => {
    const profile = this.profile();
    if (!profile?.dateOfBirth) return null;
    const dob = new Date(profile.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  });

  savingsRate = computed(() => {
    const summary = this.cashFlowSummary();
    return summary?.savingsRate ?? 0;
  });

  ngOnInit(): void {
    this.loadProfile();
    this.loadNetWorth();
    this.loadCashFlowSummary();
    // Eagerly load asset/liability counts so they appear immediately
    this.loadAllAssetCounts();
  }

  /**
   * Load all asset/liability data so counts appear immediately
   * without waiting for user to expand sections.
   */
  private loadAllAssetCounts(): void {
    // Load properties count
    this.propertyService.getProperties().subscribe({
      next: (data) => this.properties.set(data),
      error: () => {} // Silently fail
    });

    // Load super accounts count
    this.superAccountService.getAll().subscribe({
      next: (data) => this.superAccounts.set(data),
      error: () => {}
    });

    // Load investments count
    this.investmentService.getAll().subscribe({
      next: (data) => this.investments.set(data),
      error: () => {}
    });

    // Load cash accounts count
    this.cashLiabilityService.getCashAccounts().subscribe({
      next: (data) => this.cashAccounts.set(data),
      error: () => {}
    });

    // Load liabilities count
    this.cashLiabilityService.getLiabilities().subscribe({
      next: (data) => this.liabilities.set(data),
      error: () => {}
    });
  }

  setTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
  }

  // Profile loading and saving
  loadProfile(): void {
    this.isProfileLoading.set(true);
    this.profileService.getProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.populateForm(profile);
        this.isProfileLoading.set(false);
      },
      error: () => {
        this.isProfileLoading.set(false);
      }
    });
  }

  private populateForm(profile: UserProfile): void {
    this.personalForm.patchValue({
      displayName: profile.displayName || '',
      dateOfBirth: profile.dateOfBirth || '',
      taxResidency: profile.taxResidency || 'RESIDENT',
      marginalTaxRate: profile.marginalTaxRate ?? 0.30,
      hasPrivateHealthInsurance: profile.hasPrivateHealthInsurance || false,
      retirementAge: profile.retirementAge || 67
    });
  }

  saveProfile(): void {
    if (this.personalForm.invalid) return;

    this.isSaving.set(true);
    const formValue = this.personalForm.value;
    const request: ProfileUpdateRequest = {
      displayName: formValue.displayName,
      dateOfBirth: formValue.dateOfBirth,
      taxResidency: formValue.taxResidency,
      marginalTaxRate: formValue.marginalTaxRate,
      hasPrivateHealthInsurance: formValue.hasPrivateHealthInsurance,
      retirementAge: formValue.retirementAge
    };

    this.profileService.updateProfile(request).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.isSaving.set(false);
        this.snackBar.open('Profile updated successfully', 'Close', { duration: 3000 });
      },
      error: () => {
        this.isSaving.set(false);
        this.snackBar.open('Failed to update profile', 'Close', { duration: 3000 });
      }
    });
  }

  // Net worth loading
  loadNetWorth(): void {
    this.isNetWorthLoading.set(true);
    this.netWorthService.getNetWorth().subscribe({
      next: (data) => {
        this.netWorth.set(data);
        this.isNetWorthLoading.set(false);
      },
      error: () => {
        this.isNetWorthLoading.set(false);
      }
    });
  }

  // Cash flow summary
  loadCashFlowSummary(): void {
    this.cashFlowService.getSummary().subscribe({
      next: (summary) => {
        this.cashFlowSummary.set(summary);
      },
      error: () => {
        // Silently fail - not critical
      }
    });
  }

  // Asset section expansion
  toggleAssetSection(section: AssetSection): void {
    const expanded = new Set(this.expandedAssetSections());
    if (expanded.has(section)) {
      expanded.delete(section);
    } else {
      expanded.add(section);
      this.loadAssetSection(section);
    }
    this.expandedAssetSections.set(expanded);
  }

  isAssetSectionExpanded(section: AssetSection): boolean {
    return this.expandedAssetSections().has(section);
  }

  private loadAssetSection(section: AssetSection): void {
    const loading = new Set(this.sectionLoading());

    switch (section) {
      case 'properties':
        if (this.properties().length > 0) return;
        loading.add('properties');
        this.sectionLoading.set(loading);
        this.propertyService.getProperties().subscribe({
          next: (data) => {
            this.properties.set(data);
            this.clearSectionLoading('properties');
          },
          error: () => this.clearSectionLoading('properties')
        });
        break;

      case 'super':
        if (this.superAccounts().length > 0) return;
        loading.add('super');
        this.sectionLoading.set(loading);
        this.superAccountService.getAll().subscribe({
          next: (data) => {
            this.superAccounts.set(data);
            this.clearSectionLoading('super');
          },
          error: () => this.clearSectionLoading('super')
        });
        break;

      case 'investments':
        if (this.investments().length > 0) return;
        loading.add('investments');
        this.sectionLoading.set(loading);
        this.investmentService.getAll().subscribe({
          next: (data) => {
            this.investments.set(data);
            this.clearSectionLoading('investments');
          },
          error: () => this.clearSectionLoading('investments')
        });
        break;

      case 'cash':
        if (this.cashAccounts().length > 0) return;
        loading.add('cash');
        this.sectionLoading.set(loading);
        this.cashLiabilityService.getCashAccounts().subscribe({
          next: (data) => {
            this.cashAccounts.set(data);
            this.clearSectionLoading('cash');
          },
          error: () => this.clearSectionLoading('cash')
        });
        break;
    }
  }

  // Liability section expansion
  toggleLiabilitySection(section: LiabilitySection): void {
    const expanded = new Set(this.expandedLiabilitySections());
    if (expanded.has(section)) {
      expanded.delete(section);
    } else {
      expanded.add(section);
      this.loadLiabilities();
    }
    this.expandedLiabilitySections.set(expanded);
  }

  isLiabilitySectionExpanded(section: LiabilitySection): boolean {
    return this.expandedLiabilitySections().has(section);
  }

  private loadLiabilities(): void {
    if (this.liabilities().length > 0) return;

    const loading = new Set(this.sectionLoading());
    loading.add('liabilities');
    this.sectionLoading.set(loading);

    this.cashLiabilityService.getLiabilities().subscribe({
      next: (data) => {
        this.liabilities.set(data);
        this.clearSectionLoading('liabilities');
      },
      error: () => this.clearSectionLoading('liabilities')
    });
  }

  private clearSectionLoading(section: string): void {
    const loading = new Set(this.sectionLoading());
    loading.delete(section);
    this.sectionLoading.set(loading);
  }

  isSectionLoading(section: string): boolean {
    return this.sectionLoading().has(section);
  }

  // Filter liabilities by type
  getLiabilitiesByType(type: string): LiabilityResponse[] {
    return this.liabilities().filter(l => l.liabilityType === type);
  }

  // Utility methods
  formatTaxRate(rate: number | null): string {
    if (rate === null) return 'Not set';
    return `${(rate * 100).toFixed(0)}%`;
  }

  getSavingsRateClass(): string {
    const rate = this.savingsRate();
    if (rate >= 0.3) return 'positive';
    if (rate >= 0.1) return 'neutral';
    return 'negative';
  }

  // Refresh data when income/expense changes
  onIncomeExpenseChanged(): void {
    this.loadCashFlowSummary();
  }

  // Subscription management
  manageSubscription(): void {
    this.isSubscriptionLoading.set(true);
    this.subscriptionService.openCustomerPortal().subscribe({
      error: (err) => {
        console.error('Failed to open customer portal:', err);
        this.isSubscriptionLoading.set(false);
        this.snackBar.open('Failed to open subscription management', 'Close', { duration: 3000 });
      }
    });
  }

  getSubscriptionStatusLabel(): string {
    // During free access mode, show beta status
    if (FREE_ACCESS_MODE) {
      return 'Free (Beta)';
    }

    const sub = this.subscription();
    if (!sub) return 'Free';

    switch (sub.status) {
      case 'ACTIVE': return 'Pro';
      case 'TRIALING': return 'Pro (Trial)';
      case 'PAST_DUE': return 'Past Due';
      case 'CANCELED': return sub.cancelAtPeriodEnd ? 'Canceling' : 'Canceled';
      default: return 'Free';
    }
  }

  getSubscriptionStatusClass(): string {
    // During free access mode, show pro styling
    if (FREE_ACCESS_MODE) {
      return 'pro';
    }

    const sub = this.subscription();
    if (!sub) return 'free';

    switch (sub.status) {
      case 'ACTIVE':
      case 'TRIALING':
        return 'pro';
      case 'PAST_DUE':
        return 'warning';
      case 'CANCELED':
        return 'canceled';
      default:
        return 'free';
    }
  }
}
