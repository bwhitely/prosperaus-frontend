import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, PercentPipe, DecimalPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TwoDecimalDirective } from '../../shared/directives/two-decimal.directive';
import { ProjectionService } from '../../core/services/projection.service';
import { ScenarioService } from '../../core/services/scenario.service';
import {
  NetWorthProjectionRequest,
  NetWorthProjectionResponse,
  YearlyBreakdown
} from '../../shared/models/projection.model';
import { ScenarioResponse } from '../../shared/models/scenario.model';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-projections',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CurrencyPipe,
    PercentPipe,
    DecimalPipe,
    DatePipe,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatCheckboxModule,
    MatTooltipModule,
    TwoDecimalDirective
  ],
  templateUrl: './projections.component.html',
  styleUrl: './projections.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectionsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private projectionService = inject(ProjectionService);
  private scenarioService = inject(ScenarioService);

  result = signal<NetWorthProjectionResponse | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Collapsible sections
  expandedSections = signal<Set<string>>(new Set(['personal', 'super', 'income']));

  // Scenario management
  scenarios = signal<ScenarioResponse[]>([]);
  showSaveForm = signal(false);
  isSaving = signal(false);
  scenarioName = signal('');

  // Table display
  showFullTable = signal(false);
  selectedYear = signal<YearlyBreakdown | null>(null);

  taxBrackets = [
    { rate: 0, label: '0% (under $18,200)' },
    { rate: 0.16, label: '16% ($18,201 - $45,000)' },
    { rate: 0.30, label: '30% ($45,001 - $135,000)' },
    { rate: 0.37, label: '37% ($135,001 - $190,000)' },
    { rate: 0.45, label: '45% ($190,001+)' }
  ];

  frequencyOptions = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'fortnightly', label: 'Fortnightly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'annually', label: 'Annually' }
  ];

  stateOptions = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

  form: FormGroup = this.fb.group({
    // Personal
    currentAge: [35, [Validators.required, Validators.min(18), Validators.max(100)]],
    targetRetirementAge: [60, [Validators.min(18), Validators.max(100)]],
    stateOfResidence: ['NSW'],
    projectionYears: [30, [Validators.required, Validators.min(1), Validators.max(50)]],

    // Superannuation
    superBalance: [150000, [Validators.min(0)]],
    superGrowthRate: [7, [Validators.min(0), Validators.max(20)]],
    sgRate: [12, [Validators.min(0), Validators.max(15)]],
    salarySacrifice: [0, [Validators.min(0)]],
    employerMatch: [0, [Validators.min(0)]],
    preservationAge: [60, [Validators.min(55), Validators.max(65)]],

    // Income Sources (dynamic array)
    incomeSources: this.fb.array([]),

    // PPOR
    pporValue: [750000, [Validators.min(0)]],
    pporMortgage: [400000, [Validators.min(0)]],
    pporInterestRate: [6, [Validators.min(0), Validators.max(20)]],
    pporOffsetBalance: [20000, [Validators.min(0)]],
    pporGrowthRate: [4, [Validators.min(0), Validators.max(15)]],
    pporExtraRepayments: [0, [Validators.min(0)]],
    pporRemainingTerm: [25, [Validators.min(1), Validators.max(30)]],

    // Shares/ETFs
    sharesValue: [50000, [Validators.min(0)]],
    sharesAnnualContributions: [12000, [Validators.min(0)]],
    sharesGrowthRate: [8, [Validators.min(-10), Validators.max(20)]],
    sharesMer: [0.4, [Validators.min(0), Validators.max(3)]],
    dividendYield: [4, [Validators.min(0), Validators.max(15)]],
    frankingRate: [100, [Validators.min(0), Validators.max(100)]],

    // Cash
    cashBalance: [30000, [Validators.min(0)]],
    monthlySavings: [500, [Validators.min(0)]],
    cashInterestRate: [4, [Validators.min(0), Validators.max(10)]],

    // Expenses
    annualExpenses: [60000, [Validators.min(0)]],
    inflationRate: [2.5, [Validators.min(0), Validators.max(10)]],

    // Tax
    marginalTaxRate: [0.30, [Validators.required]],
    includeFrankingCredits: [true]
  });

  // Computed values
  netWorthGrowth = computed(() => {
    const r = this.result();
    if (!r) return null;
    return {
      current: r.summary.currentNetWorth,
      projected: r.summary.projectedNetWorth,
      growth: r.summary.totalGrowth,
      percentGrowth: r.summary.percentageGrowth * 100
    };
  });

  keyMilestones = computed(() => {
    const r = this.result();
    if (!r) return [];

    const milestones = [];

    if (r.milestones.firstMillionAge) {
      milestones.push({
        label: 'First $1M',
        age: r.milestones.firstMillionAge,
        years: r.milestones.yearsToFirstMillion
      });
    }

    if (r.milestones.mortgagePayoffAge) {
      milestones.push({
        label: 'Mortgage Free',
        age: r.milestones.mortgagePayoffAge,
        years: r.milestones.yearsToMortgagePayoff
      });
    }

    if (r.milestones.fireAchievable && r.milestones.fireAge) {
      milestones.push({
        label: 'Financial Independence',
        age: r.milestones.fireAge,
        years: r.milestones.yearsToFire
      });
    }

    milestones.push({
      label: 'Super Access',
      age: r.milestones.superAccessAge,
      years: r.milestones.yearsToSuperAccess
    });

    return milestones;
  });

  // Line graph computed properties
  graphDimensions = {
    width: 600,
    height: 300,
    padding: { top: 20, right: 30, bottom: 50, left: 80 }
  };

  graphData = computed(() => {
    const r = this.result();
    if (!r || r.yearlyBreakdown.length === 0) return null;

    const data = r.yearlyBreakdown;
    const { width, height, padding } = this.graphDimensions;

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const minYear = data[0].year;
    const maxYear = data[data.length - 1].year;
    const minNetWorth = 0;
    const maxNetWorth = Math.max(...data.map(d => d.netWorth)) * 1.1;

    const xScale = (year: number) =>
      padding.left + ((year - minYear) / (maxYear - minYear)) * chartWidth;

    const yScale = (netWorth: number) =>
      padding.top + chartHeight - ((netWorth - minNetWorth) / (maxNetWorth - minNetWorth)) * chartHeight;

    // Generate path
    const pathPoints = data.map((d, i) => {
      const x = xScale(d.year);
      const y = yScale(d.netWorth);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    // Generate area path (for gradient fill)
    const areaPath = pathPoints +
      ` L ${xScale(maxYear)} ${padding.top + chartHeight}` +
      ` L ${xScale(minYear)} ${padding.top + chartHeight} Z`;

    // Generate data points for key years
    const keyYears = [0, 1, 5, 10, 15, 20, 25, 30];
    const dataPoints = data
      .filter((_, i) => keyYears.includes(i) || i === data.length - 1)
      .map(d => ({
        x: xScale(d.year),
        y: yScale(d.netWorth),
        year: d.year,
        age: d.age,
        netWorth: d.netWorth
      }));

    // Generate Y axis labels
    const yAxisSteps = 5;
    const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
      const value = minNetWorth + (maxNetWorth - minNetWorth) * (i / yAxisSteps);
      return {
        value,
        y: yScale(value),
        label: this.formatCompactCurrency(value)
      };
    });

    // Generate X axis labels
    const xAxisLabels = data
      .filter((_, i) => i % 5 === 0 || i === data.length - 1)
      .map(d => ({
        year: d.year,
        x: xScale(d.year),
        label: `Yr ${d.year}`
      }));

    // Grid lines
    const horizontalGridLines = yAxisLabels.map(l => ({
      y: l.y,
      x1: padding.left,
      x2: width - padding.right
    }));

    return {
      pathPoints,
      areaPath,
      dataPoints,
      yAxisLabels,
      xAxisLabels,
      horizontalGridLines,
      chartArea: {
        x: padding.left,
        y: padding.top,
        width: chartWidth,
        height: chartHeight
      }
    };
  });

  formatCompactCurrency(value: number): string {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  }

  get incomeSources(): FormArray {
    return this.form.get('incomeSources') as FormArray;
  }

  constructor() {
    // Add default income source
    this.addIncomeSource();

    // Auto-calculate on form changes (debounced)
    this.form.valueChanges.pipe(
      debounceTime(800),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    ).subscribe(() => {
      if (this.form.valid) {
        this.calculate();
      }
    });
  }

  ngOnInit(): void {
    this.loadPrefillData();
    this.loadScenarios();
    // Initial calculation after a short delay
    setTimeout(() => this.calculate(), 200);
  }

  loadPrefillData(): void {
    this.projectionService.getPrefillData().subscribe({
      next: (data) => {
        if (data && Object.keys(data).length > 0) {
          const patchData: Record<string, unknown> = {};

          // Personal details
          if (data.personal) {
            if (data.personal.currentAge) {
              patchData['currentAge'] = data.personal.currentAge;
            }
            if (data.personal.targetRetirementAge) {
              patchData['targetRetirementAge'] = data.personal.targetRetirementAge;
            }
          }

          // Superannuation
          if (data.superannuation) {
            if (data.superannuation.currentBalance !== undefined) {
              patchData['superBalance'] = data.superannuation.currentBalance;
            }
            if (data.superannuation.salarySacrifice !== undefined) {
              patchData['salarySacrifice'] = data.superannuation.salarySacrifice;
            }
          }

          // PPOR
          if (data.ppor) {
            if (data.ppor.currentValue !== undefined) {
              patchData['pporValue'] = data.ppor.currentValue;
            }
            if (data.ppor.mortgageBalance !== undefined) {
              patchData['pporMortgage'] = data.ppor.mortgageBalance;
            }
            if (data.ppor.interestRate !== undefined) {
              // Backend returns decimal, form expects percentage
              patchData['pporInterestRate'] = data.ppor.interestRate * 100;
            }
            if (data.ppor.offsetBalance !== undefined) {
              patchData['pporOffsetBalance'] = data.ppor.offsetBalance;
            }
            if (data.ppor.remainingTermYears !== undefined) {
              patchData['pporRemainingTerm'] = data.ppor.remainingTermYears;
            }
          }

          // Shares
          if (data.shares && data.shares.currentValue !== undefined) {
            patchData['sharesValue'] = data.shares.currentValue;
          }

          // Cash
          if (data.cash && data.cash.currentBalance !== undefined) {
            patchData['cashBalance'] = data.cash.currentBalance;
          }

          // Expenses
          if (data.expenses && data.expenses.annualAmount !== undefined) {
            patchData['annualExpenses'] = data.expenses.annualAmount;
          }

          // Tax
          if (data.tax && data.tax.marginalTaxRate !== undefined) {
            patchData['marginalTaxRate'] = data.tax.marginalTaxRate;
          }

          if (Object.keys(patchData).length > 0) {
            this.form.patchValue(patchData);
          }

          // Handle income sources (dynamic array)
          if (data.incomeSources && data.incomeSources.length > 0) {
            // Clear existing and add from prefill
            this.incomeSources.clear();
            data.incomeSources.forEach(source => {
              this.incomeSources.push(this.fb.group({
                name: [source.name || ''],
                sourceType: [source.sourceType || 'SALARY'],
                amount: [source.amount || 0],
                frequency: [source.frequency?.toLowerCase() || 'annually'],
                annualGrowthRate: [3]
              }));
            });
          }
        }
      },
      error: () => {
        // Silently fail - form stays with defaults
      }
    });
  }

  setSectionExpanded(section: string, expanded: boolean): void {
    this.expandedSections.update(set => {
      const newSet = new Set(set);
      if (expanded) {
        newSet.add(section);
      } else {
        newSet.delete(section);
      }
      return newSet;
    });
  }

  isSectionExpanded(section: string): boolean {
    return this.expandedSections().has(section);
  }

  addIncomeSource(): void {
    const group = this.fb.group({
      name: ['Salary'],
      sourceType: ['salary'],
      amount: [100000, [Validators.required, Validators.min(0)]],
      frequency: ['annually'],
      annualGrowthRate: [3, [Validators.min(-10), Validators.max(20)]]
    });
    this.incomeSources.push(group);
  }

  removeIncomeSource(index: number): void {
    this.incomeSources.removeAt(index);
  }

  calculate(): void {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    this.error.set(null);

    const formValue = this.form.value;

    const request: NetWorthProjectionRequest = {
      personal: {
        currentAge: formValue.currentAge,
        targetRetirementAge: formValue.targetRetirementAge,
        stateOfResidence: formValue.stateOfResidence
      },
      superannuation: {
        currentBalance: formValue.superBalance || 0,
        growthRate: (formValue.superGrowthRate || 7) / 100,
        sgRate: (formValue.sgRate || 12) / 100,
        salarySacrifice: formValue.salarySacrifice || 0,
        employerMatch: (formValue.employerMatch || 0) / 100,
        preservationAge: formValue.preservationAge || 60
      },
      incomeSources: formValue.incomeSources?.map((source: Record<string, unknown>) => ({
        name: source['name'] as string,
        sourceType: source['sourceType'] as string,
        amount: source['amount'] as number,
        frequency: source['frequency'] as string,
        annualGrowthRate: ((source['annualGrowthRate'] as number) || 3) / 100
      })) || [],
      ppor: formValue.pporValue > 0 ? {
        currentValue: formValue.pporValue,
        mortgageBalance: formValue.pporMortgage || 0,
        interestRate: (formValue.pporInterestRate || 6) / 100,
        offsetBalance: formValue.pporOffsetBalance || 0,
        growthRate: (formValue.pporGrowthRate || 4) / 100,
        extraRepayments: formValue.pporExtraRepayments || 0,
        remainingTermYears: formValue.pporRemainingTerm || 25
      } : undefined,
      shares: {
        currentValue: formValue.sharesValue || 0,
        annualContributions: formValue.sharesAnnualContributions || 0,
        growthRate: (formValue.sharesGrowthRate || 8) / 100,
        weightedMer: (formValue.sharesMer || 0.4) / 100,
        dividendYield: (formValue.dividendYield || 4) / 100,
        frankingRate: (formValue.frankingRate || 100) / 100
      },
      cash: {
        currentBalance: formValue.cashBalance || 0,
        monthlySavings: formValue.monthlySavings || 0,
        interestRate: (formValue.cashInterestRate || 4) / 100
      },
      expenses: {
        annualAmount: formValue.annualExpenses || 0,
        inflationRate: (formValue.inflationRate || 2.5) / 100
      },
      tax: {
        marginalTaxRate: formValue.marginalTaxRate,
        includeFrankingCredits: formValue.includeFrankingCredits
      },
      projectionYears: formValue.projectionYears
    };

    this.projectionService.calculate(request).subscribe({
      next: (response) => {
        this.result.set(response);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Projection failed:', err);
        this.error.set(err.error?.message || 'Projection failed. Please check your inputs.');
        this.isLoading.set(false);
      }
    });
  }

  // Scenario management
  loadScenarios(): void {
    this.projectionService.getScenarios().subscribe({
      next: (scenarios) => this.scenarios.set(scenarios),
      error: () => {} // Silently fail if not authenticated
    });
  }

  openSaveForm(): void {
    this.showSaveForm.set(true);
  }

  closeSaveForm(): void {
    this.showSaveForm.set(false);
    this.scenarioName.set('');
  }

  saveScenario(): void {
    const name = this.scenarioName().trim();
    if (!name) return;

    this.isSaving.set(true);

    const formValue = this.form.value;
    const request: NetWorthProjectionRequest = this.buildRequest(formValue);

    this.projectionService.calculateAndSave(request, name).subscribe({
      next: () => {
        this.loadScenarios();
        this.closeSaveForm();
        this.isSaving.set(false);
      },
      error: () => {
        this.error.set('Failed to save scenario');
        this.isSaving.set(false);
      }
    });
  }

  loadScenario(scenario: ScenarioResponse): void {
    const input = scenario.inputData as Record<string, unknown>;
    const personal = input['personal'] as Record<string, unknown>;
    const superData = input['superannuation'] as Record<string, unknown>;
    const ppor = input['ppor'] as Record<string, unknown> | undefined;
    const shares = input['shares'] as Record<string, unknown>;
    const cash = input['cash'] as Record<string, unknown>;
    const expenses = input['expenses'] as Record<string, unknown>;
    const tax = input['tax'] as Record<string, unknown>;

    this.form.patchValue({
      currentAge: personal['currentAge'],
      targetRetirementAge: personal['targetRetirementAge'],
      stateOfResidence: personal['stateOfResidence'],
      projectionYears: input['projectionYears'],

      superBalance: superData['currentBalance'],
      superGrowthRate: (superData['growthRate'] as number) * 100,
      sgRate: (superData['sgRate'] as number) * 100,
      salarySacrifice: superData['salarySacrifice'],
      employerMatch: (superData['employerMatch'] as number) * 100,
      preservationAge: superData['preservationAge'],

      pporValue: ppor?.['currentValue'] || 0,
      pporMortgage: ppor?.['mortgageBalance'] || 0,
      pporInterestRate: ((ppor?.['interestRate'] as number) || 0.06) * 100,
      pporOffsetBalance: ppor?.['offsetBalance'] || 0,
      pporGrowthRate: ((ppor?.['growthRate'] as number) || 0.04) * 100,
      pporExtraRepayments: ppor?.['extraRepayments'] || 0,
      pporRemainingTerm: ppor?.['remainingTermYears'] || 25,

      sharesValue: shares['currentValue'],
      sharesAnnualContributions: shares['annualContributions'],
      sharesGrowthRate: (shares['growthRate'] as number) * 100,
      sharesMer: (shares['weightedMer'] as number) * 100,
      dividendYield: (shares['dividendYield'] as number) * 100,
      frankingRate: (shares['frankingRate'] as number) * 100,

      cashBalance: cash['currentBalance'],
      monthlySavings: cash['monthlySavings'],
      cashInterestRate: (cash['interestRate'] as number) * 100,

      annualExpenses: expenses['annualAmount'],
      inflationRate: (expenses['inflationRate'] as number) * 100,

      marginalTaxRate: tax['marginalTaxRate'],
      includeFrankingCredits: tax['includeFrankingCredits']
    });
  }

  selectYear(year: YearlyBreakdown): void {
    this.selectedYear.set(year);
  }

  toggleFullTable(): void {
    this.showFullTable.update(v => !v);
  }

  getDisplayYears(): YearlyBreakdown[] {
    const r = this.result();
    if (!r) return [];

    if (this.showFullTable()) {
      return r.yearlyBreakdown;
    }

    // Show key years: 0, 1, 5, 10, 15, 20, 25, 30, and last year
    const keyYears = [0, 1, 5, 10, 15, 20, 25, 30];
    const lastYear = r.yearlyBreakdown.length - 1;

    return r.yearlyBreakdown.filter((_, index) =>
      keyYears.includes(index) || index === lastYear
    );
  }

  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  private buildRequest(formValue: Record<string, unknown>): NetWorthProjectionRequest {
    return {
      personal: {
        currentAge: formValue['currentAge'] as number,
        targetRetirementAge: formValue['targetRetirementAge'] as number,
        stateOfResidence: formValue['stateOfResidence'] as string
      },
      superannuation: {
        currentBalance: formValue['superBalance'] as number || 0,
        growthRate: ((formValue['superGrowthRate'] as number) || 7) / 100,
        sgRate: ((formValue['sgRate'] as number) || 12) / 100,
        salarySacrifice: formValue['salarySacrifice'] as number || 0,
        employerMatch: ((formValue['employerMatch'] as number) || 0) / 100,
        preservationAge: formValue['preservationAge'] as number || 60
      },
      incomeSources: (formValue['incomeSources'] as Record<string, unknown>[])?.map((source) => ({
        name: source['name'] as string,
        sourceType: source['sourceType'] as string,
        amount: source['amount'] as number,
        frequency: source['frequency'] as 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually',
        annualGrowthRate: ((source['annualGrowthRate'] as number) || 3) / 100
      })) || [],
      ppor: (formValue['pporValue'] as number) > 0 ? {
        currentValue: formValue['pporValue'] as number,
        mortgageBalance: formValue['pporMortgage'] as number || 0,
        interestRate: ((formValue['pporInterestRate'] as number) || 6) / 100,
        offsetBalance: formValue['pporOffsetBalance'] as number || 0,
        growthRate: ((formValue['pporGrowthRate'] as number) || 4) / 100,
        extraRepayments: formValue['pporExtraRepayments'] as number || 0,
        remainingTermYears: formValue['pporRemainingTerm'] as number || 25
      } : undefined,
      shares: {
        currentValue: formValue['sharesValue'] as number || 0,
        annualContributions: formValue['sharesAnnualContributions'] as number || 0,
        growthRate: ((formValue['sharesGrowthRate'] as number) || 8) / 100,
        weightedMer: ((formValue['sharesMer'] as number) || 0.4) / 100,
        dividendYield: ((formValue['dividendYield'] as number) || 4) / 100,
        frankingRate: ((formValue['frankingRate'] as number) || 100) / 100
      },
      cash: {
        currentBalance: formValue['cashBalance'] as number || 0,
        monthlySavings: formValue['monthlySavings'] as number || 0,
        interestRate: ((formValue['cashInterestRate'] as number) || 4) / 100
      },
      expenses: {
        annualAmount: formValue['annualExpenses'] as number || 0,
        inflationRate: ((formValue['inflationRate'] as number) || 2.5) / 100
      },
      tax: {
        marginalTaxRate: formValue['marginalTaxRate'] as number,
        includeFrankingCredits: formValue['includeFrankingCredits'] as boolean
      },
      projectionYears: formValue['projectionYears'] as number
    };
  }
}
