import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { EquityRecyclingService } from '../../core/services/equity-recycling.service';
import { ScenarioService } from '../../core/services/scenario.service';
import { EquityRecyclingRequest, EquityRecyclingResponse } from '../../shared/models/equity-recycling.model';
import { ScenarioRequest, ScenarioResponse } from '../../shared/models/scenario.model';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-equity-recycling',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
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
    MatTooltipModule
  ],
  templateUrl: './equity-recycling.component.html',
  styleUrl: './equity-recycling.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EquityRecyclingComponent implements OnInit {
  private fb = inject(FormBuilder);
  private equityRecyclingService = inject(EquityRecyclingService);
  private scenarioService = inject(ScenarioService);

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

  availableEquity = computed(() => {
    const result = this.result();
    return result?.availableEquity ?? 0;
  });

  totalBenefit = computed(() => {
    const result = this.result();
    return result?.totalBenefit ?? 0;
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
    this.loadScenarios();
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
}
