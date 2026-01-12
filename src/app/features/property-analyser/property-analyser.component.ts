import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TwoDecimalDirective } from '../../shared/directives/two-decimal.directive';
import { PropertyAnalyserService } from '../../core/services/property-analyser.service';
import { PropertyAnalysisRequest, PropertyAnalysisResponse, YearProjection, CgtScenario } from '../../shared/models/property-analysis.model';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-property-analyser',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatTooltipModule,
    TwoDecimalDirective
  ],
  templateUrl: './property-analyser.component.html',
  styleUrl: './property-analyser.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PropertyAnalyserComponent {
  private readonly fb = inject(FormBuilder);
  private readonly propertyService = inject(PropertyAnalyserService);

  // Expose Math to template
  Math = Math;

  // State signals
  result = signal<PropertyAnalysisResponse | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);
  activeTab = 0; // Tab index for mat-tab-group
  showAdvanced = signal(false);

  // Computed values for display
  weeklyNetCostFormatted = computed(() => {
    const r = this.result();
    if (!r) return null;
    const cost = r.weeklyNetCost;
    return {
      value: Math.abs(cost),
      isOutOfPocket: cost < 0,
      label: cost < 0 ? 'Weekly out-of-pocket' : 'Weekly surplus'
    };
  });

  cashFlowSummary = computed(() => {
    const r = this.result();
    if (!r) return null;

    const cf = r.year1CashFlow;

    const beforeTax = cf.netCashFlow ?? 0;
    const taxBenefit = r.taxBenefit ?? 0;
    const afterTax = beforeTax + taxBenefit;

    // Break-even weekly rent (estimate)
    // Uses observed Year-1 ratios to approximate variable components:
    // - vacancyRatio = vacancyAllowance / grossRent
    // - managementRatio = managementFees / netRent
    const grossRent = cf.grossRent ?? 0;
    const vacancyAllowance = cf.vacancyAllowance ?? 0;
    const netRent = cf.netRent ?? 0;

    const managementFees = cf.managementFees ?? 0;
    const totalExpenses = cf.totalExpenses ?? 0;
    const interestPayments = cf.interestPayments ?? 0;

    let breakEvenWeeklyRent: number | null = null;

    if (grossRent > 0 && netRent > 0) {
      const vacancyRatio = Math.min(Math.max(vacancyAllowance / grossRent, 0), 0.9);
      const managementRatio = Math.min(Math.max(managementFees / netRent, 0), 0.9);

      // Treat everything except management fees as "fixed" for the estimate
      const fixedExpenses = Math.max(totalExpenses - managementFees, 0);

      // Need: netRent - (fixedExpenses + managementRatio*netRent) - interestPayments = 0
      // => netRent*(1 - managementRatio) = fixedExpenses + interestPayments
      const requiredNetRent = (fixedExpenses + interestPayments) / Math.max(1 - managementRatio, 0.0001);

      // netRent = grossRent*(1 - vacancyRatio)
      const requiredGrossRent = requiredNetRent / Math.max(1 - vacancyRatio, 0.0001);

      breakEvenWeeklyRent = requiredGrossRent / 52;
    }

    return {
      beforeTax,
      taxBenefit,
      afterTax,
      breakEvenWeeklyRent
    };
  });


  // Form with validation
  form: FormGroup = this.fb.group({
    // Purchase Details
    purchasePrice: [800000, [Validators.required, Validators.min(0)]],
    depositAmount: [160000, [Validators.required, Validators.min(0)]],
    stampDuty: [32000],
    otherPurchaseCosts: [5000],

    // Loan Details
    interestRate: [6.5, [Validators.required, Validators.min(0), Validators.max(100)]],
    loanTermYears: [30, [Validators.required, Validators.min(1), Validators.max(40)]],
    isInterestOnly: [false],
    interestOnlyPeriodYears: [5],

    // Rental Income
    weeklyRent: [650, [Validators.required, Validators.min(0)]],
    vacancyRate: [4],
    rentGrowthRate: [3],

    // Annual Expenses
    councilRates: [2000],
    waterRates: [800],
    strataFees: [0],
    insurance: [1500],
    maintenance: [2000],
    managementFeeRate: [8],
    otherExpenses: [500],

    // Growth Assumptions
    capitalGrowthRate: [5],

    // Tax Details
    marginalTaxRate: [37, [Validators.required, Validators.min(0), Validators.max(100)]],
    annualDepreciation: [8000],

    // Comparison Settings
    etfReturnRate: [8],
    projectionYears: [10, [Validators.min(1), Validators.max(30)]]
  });

  // Tax bracket options
  taxBrackets = [
    { label: '0% ($0 - $18,200)', value: 0 },
    { label: '16% ($18,201 - $45,000)', value: 16 },
    { label: '30% ($45,001 - $135,000)', value: 30 },
    { label: '37% ($135,001 - $190,000)', value: 37 },
    { label: '45% ($190,001+)', value: 45 }
  ];

  constructor() {
    // Auto-calculate on form changes
    this.form.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      filter(() => this.form.valid),
      takeUntilDestroyed()
    ).subscribe(() => {
      this.calculate();
    });
  }

  ngOnInit(): void {
    this.loadPrefillData();
    // Initial calculation
    if (this.form.valid) {
      this.calculate();
    }
    const interestCtrl = this.form.get('interestRate');

    interestCtrl?.valueChanges.subscribe(value => {
      if (value === null || value === undefined) return;
  
      const rounded = Math.round(value * 100) / 100;
  
      if (value !== rounded) {
        interestCtrl.setValue(rounded, { emitEvent: false });
      }
    });
  }

  loadPrefillData(): void {
    this.propertyService.getPrefillData().subscribe({
      next: (data) => {
        if (data && Object.keys(data).length > 0) {
          const patchData: Record<string, unknown> = {};

          if (data.purchasePrice) {
            patchData['purchasePrice'] = data.purchasePrice;
          }
          if (data.depositAmount) {
            patchData['depositAmount'] = data.depositAmount;
          }
          if (data.interestRate) {
            // Backend returns decimal (0.065), form expects percentage (6.5)
            patchData['interestRate'] = data.interestRate * 100;
          }
          if (data.loanTermYears) {
            patchData['loanTermYears'] = data.loanTermYears;
          }
          if (data.weeklyRent) {
            patchData['weeklyRent'] = data.weeklyRent;
          }
          if (data.otherExpenses !== undefined) {
            patchData['otherExpenses'] = data.otherExpenses;
          }
          if (data.marginalTaxRate) {
            // Backend returns decimal (0.37), form expects percentage (37)
            patchData['marginalTaxRate'] = data.marginalTaxRate * 100;
          }
          if (data.isInterestOnly !== undefined) {
            patchData['isInterestOnly'] = data.isInterestOnly;
          }

          if (Object.keys(patchData).length > 0) {
            this.form.patchValue(patchData);
          }
        }
      },
      error: () => {
        // Silently fail - form stays with defaults
      }
    });
  }

  calculate(): void {
    if (this.form.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    const formValue = this.form.value;
    const request: PropertyAnalysisRequest = {
      purchasePrice: formValue.purchasePrice,
      depositAmount: formValue.depositAmount,
      stampDuty: formValue.stampDuty || 0,
      otherPurchaseCosts: formValue.otherPurchaseCosts || 0,
      interestRate: formValue.interestRate / 100,
      loanTermYears: formValue.loanTermYears,
      isInterestOnly: formValue.isInterestOnly,
      interestOnlyPeriodYears: formValue.interestOnlyPeriodYears,
      weeklyRent: formValue.weeklyRent,
      vacancyRate: (formValue.vacancyRate || 4) / 100,
      rentGrowthRate: (formValue.rentGrowthRate || 3) / 100,
      councilRates: formValue.councilRates || 0,
      waterRates: formValue.waterRates || 0,
      strataFees: formValue.strataFees || 0,
      insurance: formValue.insurance || 0,
      maintenance: formValue.maintenance || 0,
      managementFeeRate: (formValue.managementFeeRate || 0) / 100,
      otherExpenses: formValue.otherExpenses || 0,
      capitalGrowthRate: (formValue.capitalGrowthRate || 5) / 100,
      marginalTaxRate: formValue.marginalTaxRate / 100,
      annualDepreciation: formValue.annualDepreciation || 0,
      etfReturnRate: (formValue.etfReturnRate || 8) / 100,
      projectionYears: formValue.projectionYears || 10
    };

    this.propertyService.analyse(request).subscribe({
      next: (response) => {
        this.result.set(response);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to analyse property');
        this.isLoading.set(false);
      }
    });
  }

  setTab(index: number): void {
    this.activeTab = index;
  }

  toggleAdvanced(): void {
    this.showAdvanced.update(v => !v);
  }

  formatCurrency(value: number | undefined | null): string {
    if (value === undefined || value === null) return '$0';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  /**
   * Format a value that is already a percentage (e.g., 80 for 80%).
   * The backend returns yields, LVR, etc. already multiplied by 100.
   */
  formatPercent(value: number | undefined | null): string {
    if (value === undefined || value === null) return '0%';
    return `${value.toFixed(2)}%`;
  }

  getInsightIcon(insight: string): string {
    if (insight.toLowerCase().includes('negative')) return 'warning';
    if (insight.toLowerCase().includes('positive') || insight.toLowerCase().includes('benefit')) return 'check';
    if (insight.toLowerCase().includes('high') && insight.toLowerCase().includes('lvr')) return 'alert';
    return 'info';
  }

  get projectionYearsValue(): number {
    return this.form.get('projectionYears')?.value || 10;
  }
}
