import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { TwoDecimalDirective } from '../../shared/directives/two-decimal.directive';
import { EquityRecyclingService } from '../../core/services/equity-recycling.service';
import { ScenarioService } from '../../core/services/scenario.service';
import { AuthService } from '../../core/auth/auth.service';
import { EquityRecyclingRequest, EquityRecyclingResponse } from '../../shared/models/equity-recycling.model';
import { ScenarioRequest, ScenarioResponse } from '../../shared/models/scenario.model';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-equity-recycling',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    CurrencyPipe,
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
    MatDialogModule,
    MatTooltipModule,
    MatButtonToggleModule,
    TwoDecimalDirective
  ],
  templateUrl: './equity-recycling.component.html',
  styleUrl: './equity-recycling.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EquityRecyclingComponent implements OnInit {
  private fb = inject(FormBuilder);
  private equityRecyclingService = inject(EquityRecyclingService);
  private scenarioService = inject(ScenarioService);
  private authService = inject(AuthService);
  private confirmDialog = inject(ConfirmDialogService);

  // Auth state for conditional UI
  isAuthenticated = this.authService.isAuthenticated;

  result = signal<EquityRecyclingResponse | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);
  showAdvanced = signal(false);

  // Scenario management
  scenarios = signal<ScenarioResponse[]>([]);
  showSaveForm = signal(false);
  showLoadForm = signal(false);
  isSaving = signal(false);
  currentScenarioId = signal<string | null>(null);
  scenarioName = signal('');

  taxBrackets = [
    { rate: 0, label: '0% (under $18,200)' },
    { rate: 0.16, label: '16% ($18,201 - $45,000)' },
    { rate: 0.30, label: '30% ($45,001 - $135,000)' },
    { rate: 0.37, label: '37% ($135,001 - $190,000)' },
    { rate: 0.45, label: '45% ($190,001+)' }
  ];

  form: FormGroup = this.fb.group({
    propertyValue: [800000, [Validators.required, Validators.min(50000)]],
    mortgageBalance: [400000, [Validators.required, Validators.min(0)]],
    interestRate: [6.5, [Validators.required, Validators.min(0.1), Validators.max(25)]],
    offsetBalance: [0, [Validators.min(0)]],
    amountToRecycle: [100000, [Validators.required, Validators.min(1000)]],
    expectedReturn: [8, [Validators.required, Validators.min(0), Validators.max(30)]],
    marginalTaxRate: [0.30, [Validators.required]],
    projectionYears: [10, [Validators.required, Validators.min(1), Validators.max(30)]],
    dividendYield: [4, [Validators.min(0), Validators.max(15)]],
    frankingRate: [100, [Validators.min(0), Validators.max(100)]]
  });

  // Scenario mode for projections: 'conservative' | 'expected' | 'bullish'
  scenarioMode = signal<'conservative' | 'expected' | 'bullish'>('expected');

  availableEquity = computed(() => {
    const result = this.result();
    return result?.availableEquity ?? 0;
  });

  totalBenefit = computed(() => {
    const result = this.result();
    return result?.totalBenefit ?? 0;
  });

  // Computed cashflow details
  cashflowDetails = computed(() => {
    const result = this.result();
    const formValue = this.form.value;
    if (!result) return null;

    const monthlyInterest = result.annualInterestCost / 12;
    const amountRecycled = result.amountRecycled;
    const dividendYield = (formValue.dividendYield || 4) / 100;
    const expectedAnnualDividends = amountRecycled * dividendYield;
    const monthlyDividends = expectedAnnualDividends / 12;

    return {
      annualInterestCost: result.annualInterestCost,
      monthlyInterestCost: monthlyInterest,
      expectedAnnualDividends,
      monthlyDividends,
      annualNetCashflow: expectedAnnualDividends - result.annualInterestCost,
      monthlyNetCashflow: monthlyDividends - monthlyInterest
    };
  });

  // Adjusted projections based on scenario mode
  adjustedProjections = computed(() => {
    const result = this.result();
    const mode = this.scenarioMode();
    if (!result?.yearlyProjections) return [];

    // Return adjustment factors for different scenarios
    const adjustmentFactor = mode === 'conservative' ? -0.03 : mode === 'bullish' ? 0.02 : 0;

    return result.yearlyProjections.map((proj, index) => {
      // Apply compound adjustment
      const yearFactor = Math.pow(1 + adjustmentFactor, index + 1);
      const adjustedRecyclingValue = proj.recyclingValue * yearFactor;
      const adjustedNetBenefit = adjustedRecyclingValue - proj.baselineValue;

      return {
        ...proj,
        adjustedRecyclingValue,
        adjustedNetBenefit
      };
    });
  });

  constructor() {
    // Auto-calculate on form changes
    this.form.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    ).subscribe(() => {
      if (this.form.valid) {
        this.calculate();
      }
    });

    // Initial calculation
    setTimeout(() => this.calculate(), 100);
  }

  ngOnInit(): void {
    // Only load user-specific data if authenticated
    if (this.isAuthenticated()) {
      this.loadPrefillData();
      this.loadScenarios();
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
    this.equityRecyclingService.getPrefillData().subscribe({
      next: (data) => {
        if (data && Object.keys(data).length > 0) {
          const patchData: Record<string, number> = {};

          if (data.propertyValue) {
            patchData['propertyValue'] = data.propertyValue;
          }
          if (data.mortgageBalance !== undefined) {
            patchData['mortgageBalance'] = data.mortgageBalance;
          }
          if (data.interestRate) {
            // Backend returns decimal (0.065), form expects percentage (6.5)
            patchData['interestRate'] = data.interestRate * 100;
          }
          if (data.offsetBalance !== undefined) {
            patchData['offsetBalance'] = data.offsetBalance;
          }
          if (data.marginalTaxRate !== undefined) {
            patchData['marginalTaxRate'] = data.marginalTaxRate;
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

  // Scenario methods
  loadScenarios(): void {
    this.scenarioService.getByType('equity_recycling').subscribe({
      next: (scenarios) => this.scenarios.set(scenarios),
      error: () => {} // Silently fail if not authenticated
    });
  }

  openSaveForm(): void {
    const currentId = this.currentScenarioId();
    const existing = currentId ? this.scenarios().find(s => s.id === currentId) : null;
    this.scenarioName.set(existing?.name || '');
    this.showSaveForm.set(true);
  }

  closeSaveForm(): void {
    this.showSaveForm.set(false);
    this.scenarioName.set('');
  }

  openLoadForm(): void {
    this.loadScenarios();
    this.showLoadForm.set(true);
  }

  closeLoadForm(): void {
    this.showLoadForm.set(false);
  }

  saveScenario(): void {
    const name = this.scenarioName().trim();
    if (!name) return;

    this.isSaving.set(true);

    const request: ScenarioRequest = {
      name,
      scenarioType: 'equity_recycling',
      inputData: this.form.value,
      resultData: this.result() as unknown as Record<string, unknown>
    };

    const currentId = this.currentScenarioId();
    const operation = currentId
      ? this.scenarioService.update(currentId, request)
      : this.scenarioService.create(request);

    operation.subscribe({
      next: (saved) => {
        this.currentScenarioId.set(saved.id);
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
    const inputData = scenario.inputData as Record<string, number>;
    this.form.patchValue({
      propertyValue: inputData['propertyValue'],
      mortgageBalance: inputData['mortgageBalance'],
      interestRate: inputData['interestRate'],
      offsetBalance: inputData['offsetBalance'],
      amountToRecycle: inputData['amountToRecycle'],
      expectedReturn: inputData['expectedReturn'],
      marginalTaxRate: inputData['marginalTaxRate'],
      projectionYears: inputData['projectionYears'],
      dividendYield: inputData['dividendYield'],
      frankingRate: inputData['frankingRate']
    });
    this.currentScenarioId.set(scenario.id);
    this.closeLoadForm();
  }

  deleteScenario(scenario: ScenarioResponse, event: Event): void {
    event.stopPropagation();
    this.confirmDialog.confirmDelete(scenario.name)
      .pipe(
        filter(confirmed => confirmed),
        switchMap(() => this.scenarioService.delete(scenario.id))
      )
      .subscribe({
        next: () => {
          if (this.currentScenarioId() === scenario.id) {
            this.currentScenarioId.set(null);
          }
          this.loadScenarios();
        },
        error: () => this.error.set('Failed to delete scenario')
      });
  }

  newScenario(): void {
    this.currentScenarioId.set(null);
    this.form.reset({
      propertyValue: 800000,
      mortgageBalance: 400000,
      interestRate: 6.5,
      offsetBalance: 0,
      amountToRecycle: 100000,
      expectedReturn: 8,
      marginalTaxRate: 0.30,
      projectionYears: 10,
      dividendYield: 4,
      frankingRate: 100
    });
  }

  getCurrentScenarioName(): string | null {
    const id = this.currentScenarioId();
    if (!id) return null;
    return this.scenarios().find(s => s.id === id)?.name || null;
  }

  calculate(): void {
    if (this.form.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    const formValue = this.form.value;
    const request: EquityRecyclingRequest = {
      propertyValue: formValue.propertyValue,
      mortgageBalance: formValue.mortgageBalance,
      interestRate: formValue.interestRate / 100,
      offsetBalance: formValue.offsetBalance || 0,
      amountToRecycle: formValue.amountToRecycle,
      expectedReturn: formValue.expectedReturn / 100,
      marginalTaxRate: formValue.marginalTaxRate,
      projectionYears: formValue.projectionYears,
      dividendYield: formValue.dividendYield / 100,
      frankingRate: formValue.frankingRate / 100
    };

    this.equityRecyclingService.calculate(request).subscribe({
      next: (response) => {
        this.result.set(response);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Calculation failed:', err);
        this.error.set(err.error?.message || 'Calculation failed. Please check your inputs.');
        this.isLoading.set(false);
      }
    });
  }

  toggleAdvanced(): void {
    this.showAdvanced.update(v => !v);
  }

  getRiskClass(riskAssessment: string | undefined): string {
    if (!riskAssessment) return '';
    if (riskAssessment.startsWith('LOW')) return 'risk-low';
    if (riskAssessment.startsWith('MODERATE')) return 'risk-moderate';
    if (riskAssessment.startsWith('HIGH')) return 'risk-high';
    return 'risk-very-high';
  }

  formatPercent(value: number): string {
    return (value * 100).toFixed(2) + '%';
  }

  setScenarioMode(mode: 'conservative' | 'expected' | 'bullish'): void {
    this.scenarioMode.set(mode);
  }

  getScenarioLabel(): string {
    const mode = this.scenarioMode();
    switch (mode) {
      case 'conservative': return 'Conservative (-3% from expected)';
      case 'bullish': return 'Bullish (+2% from expected)';
      default: return 'Expected (based on inputs)';
    }
  }

}
