import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FireService } from '../../core/services/fire.service';
import { ScenarioService } from '../../core/services/scenario.service';
import { FireProjectionRequest, FireProjectionResponse, YearProjection } from '../../shared/models/fire.model';
import { ScenarioRequest, ScenarioResponse } from '../../shared/models/scenario.model';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-fire-calculator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, DecimalPipe],
  templateUrl: './fire-calculator.component.html',
  styleUrl: './fire-calculator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FireCalculatorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private fireService = inject(FireService);
  private scenarioService = inject(ScenarioService);

  result = signal<FireProjectionResponse | null>(null);
  isLoading = signal(false);
  isPrefilling = signal(false);
  error = signal<string | null>(null);
  showAdvanced = signal(false);

  // Scenario management
  scenarios = signal<ScenarioResponse[]>([]);
  showSaveModal = signal(false);
  showLoadModal = signal(false);
  isSaving = signal(false);
  currentScenarioId = signal<string | null>(null);
  scenarioName = signal('');

  // Projection view
  showAllProjections = signal(false);

  form: FormGroup = this.fb.group({
    currentAge: [35, [Validators.required, Validators.min(18), Validators.max(80)]],
    targetRetirementAge: [null, [Validators.min(30), Validators.max(100)]],
    currentSuperBalance: [100000, [Validators.required, Validators.min(0)]],
    currentNonSuperInvestments: [50000, [Validators.required, Validators.min(0)]],
    annualGrossIncome: [120000, [Validators.required, Validators.min(0)]],
    annualExpenses: [60000, [Validators.required, Validators.min(0)]],
    annualSavings: [null], // Auto-calculated if not provided
    preRetirementReturnRate: [7, [Validators.min(0), Validators.max(20)]],
    postRetirementReturnRate: [5, [Validators.min(0), Validators.max(15)]],
    superGuaranteeRate: [12, [Validators.min(0), Validators.max(30)]],
    annualSalarySacrifice: [0, [Validators.min(0)]],
    inflationRate: [2.5, [Validators.min(0), Validators.max(10)]],
    safeWithdrawalRate: [4, [Validators.min(2), Validators.max(10)]],
    includeAgePension: [true]
  });

  // Computed values
  fireNumber = computed(() => this.result()?.fireNumber ?? 0);
  fireAge = computed(() => this.result()?.fireAge ?? null);
  yearsToFire = computed(() => this.result()?.yearsToFire ?? null);
  canAchieveFire = computed(() => this.result()?.canAchieveFire ?? false);

  totalAssetsAtFire = computed(() => this.result()?.totalAssetsAtFire ?? 0);
  safeWithdrawalAmount = computed(() => this.result()?.safeWithdrawalAmount ?? 0);

  savingsRate = computed(() => {
    const income = this.form.get('annualGrossIncome')?.value || 0;
    const expenses = this.form.get('annualExpenses')?.value || 0;
    if (income <= 0) return 0;
    return ((income - expenses) / income) * 100;
  });

  displayedProjections = computed(() => {
    const projections = this.result()?.projections ?? [];
    if (this.showAllProjections()) {
      return projections;
    }
    // Show key milestones: every 5 years, FIRE age, age 60, age 67
    const fireAge = this.result()?.fireAge;
    return projections.filter(p =>
      p.age % 5 === 0 ||
      p.age === fireAge ||
      p.age === 60 ||
      p.age === 67 ||
      p.age === this.form.get('currentAge')?.value
    );
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
  }

  ngOnInit(): void {
    this.loadPrefillData();
    this.loadScenarios();
  }

  loadPrefillData(): void {
    this.isPrefilling.set(true);
    this.fireService.getPrefillData().subscribe({
      next: (data) => {
        if (data) {
          this.form.patchValue({
            currentAge: data.currentAge ?? this.form.get('currentAge')?.value,
            targetRetirementAge: data.targetRetirementAge,
            currentSuperBalance: data.currentSuperBalance ?? this.form.get('currentSuperBalance')?.value,
            currentNonSuperInvestments: data.currentNonSuperInvestments ?? this.form.get('currentNonSuperInvestments')?.value,
            annualGrossIncome: data.annualGrossIncome ?? this.form.get('annualGrossIncome')?.value,
            annualExpenses: data.annualExpenses ?? this.form.get('annualExpenses')?.value,
            annualSalarySacrifice: data.annualSalarySacrifice ?? 0
          });
        }
        this.isPrefilling.set(false);
        this.calculate();
      },
      error: () => {
        this.isPrefilling.set(false);
        this.calculate(); // Calculate with defaults if prefill fails
      }
    });
  }

  loadScenarios(): void {
    this.scenarioService.getByType('fire_calculator').subscribe({
      next: (scenarios) => this.scenarios.set(scenarios),
      error: () => {} // Silently fail if not authenticated
    });
  }

  openSaveModal(): void {
    const currentId = this.currentScenarioId();
    const existing = currentId ? this.scenarios().find(s => s.id === currentId) : null;
    this.scenarioName.set(existing?.name || '');
    this.showSaveModal.set(true);
  }

  closeSaveModal(): void {
    this.showSaveModal.set(false);
    this.scenarioName.set('');
  }

  openLoadModal(): void {
    this.loadScenarios();
    this.showLoadModal.set(true);
  }

  closeLoadModal(): void {
    this.showLoadModal.set(false);
  }

  saveScenario(): void {
    const name = this.scenarioName().trim();
    if (!name) return;

    this.isSaving.set(true);

    const request: ScenarioRequest = {
      name,
      scenarioType: 'fire_calculator',
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
        this.closeSaveModal();
        this.isSaving.set(false);
      },
      error: () => {
        this.error.set('Failed to save scenario');
        this.isSaving.set(false);
      }
    });
  }

  loadScenario(scenario: ScenarioResponse): void {
    const inputData = scenario.inputData as Record<string, unknown>;
    this.form.patchValue(inputData);
    this.currentScenarioId.set(scenario.id);
    this.closeLoadModal();
  }

  deleteScenario(scenario: ScenarioResponse, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Delete "${scenario.name}"?`)) return;

    this.scenarioService.delete(scenario.id).subscribe({
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
      currentAge: 35,
      targetRetirementAge: null,
      currentSuperBalance: 100000,
      currentNonSuperInvestments: 50000,
      annualGrossIncome: 120000,
      annualExpenses: 60000,
      annualSavings: null,
      preRetirementReturnRate: 7,
      postRetirementReturnRate: 5,
      superGuaranteeRate: 12,
      annualSalarySacrifice: 0,
      inflationRate: 2.5,
      safeWithdrawalRate: 4,
      includeAgePension: true
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
    const request: FireProjectionRequest = {
      currentAge: formValue.currentAge,
      targetRetirementAge: formValue.targetRetirementAge || undefined,
      currentSuperBalance: formValue.currentSuperBalance,
      currentNonSuperInvestments: formValue.currentNonSuperInvestments,
      annualGrossIncome: formValue.annualGrossIncome,
      annualExpenses: formValue.annualExpenses,
      annualSavings: formValue.annualSavings || undefined,
      preRetirementReturnRate: formValue.preRetirementReturnRate / 100,
      postRetirementReturnRate: formValue.postRetirementReturnRate / 100,
      superGuaranteeRate: formValue.superGuaranteeRate / 100,
      annualSalarySacrifice: formValue.annualSalarySacrifice || 0,
      inflationRate: formValue.inflationRate / 100,
      safeWithdrawalRate: formValue.safeWithdrawalRate / 100,
      includeAgePension: formValue.includeAgePension
    };

    this.fireService.calculate(request).subscribe({
      next: (response) => {
        this.result.set(response);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('FIRE calculation failed:', err);
        this.error.set(err.error?.message || 'Calculation failed. Please check your inputs.');
        this.isLoading.set(false);
      }
    });
  }

  toggleAdvanced(): void {
    this.showAdvanced.update(v => !v);
  }

  toggleAllProjections(): void {
    this.showAllProjections.update(v => !v);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatPercent(value: number): string {
    return (value * 100).toFixed(1) + '%';
  }

  getRowClass(projection: YearProjection): string {
    const classes: string[] = [];
    if (projection.age === this.result()?.fireAge) {
      classes.push('fire-row');
    }
    if (projection.age === 60) {
      classes.push('preservation-row');
    }
    if (projection.age === 67) {
      classes.push('pension-row');
    }
    if (projection.hasFired) {
      classes.push('retired');
    }
    return classes.join(' ');
  }

  getProgressToFire(): number {
    const currentTotal = (this.form.get('currentSuperBalance')?.value || 0) +
                         (this.form.get('currentNonSuperInvestments')?.value || 0);
    const fireNumber = this.fireNumber();
    if (fireNumber <= 0) return 0;
    return Math.min((currentTotal / fireNumber) * 100, 100);
  }

  getPhaseLabel(projection: YearProjection): string {
    if (!projection.hasFired) return 'Accumulating';
    if (!projection.canAccessSuper) return 'Early FIRE';
    if (projection.receivingAgePension) return 'FIRE + Pension';
    return 'FIRE';
  }
}
