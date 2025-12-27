import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PropertyAnalyserService } from '../../core/services/property-analyser.service';
import { PropertyAnalysisRequest, PropertyAnalysisResponse, YearProjection, CgtScenario } from '../../shared/models/property-analysis.model';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-property-analyser',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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
  activeTab = signal<'summary' | 'cashflow' | 'projections' | 'comparison' | 'cgt'>('summary');
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
    // Initial calculation
    if (this.form.valid) {
      this.calculate();
    }
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

  setTab(tab: 'summary' | 'cashflow' | 'projections' | 'comparison' | 'cgt'): void {
    this.activeTab.set(tab);
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

  formatPercent(value: number | undefined | null): string {
    if (value === undefined || value === null) return '0%';
    return `${(value * 100).toFixed(2)}%`;
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
