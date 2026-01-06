import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe, PercentPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { SuperOptimiserService } from '../../core/services/super-optimiser.service';
import {
  SuperOptimisationRequest,
  SuperOptimisationResponse,
  Recommendation
} from '../../shared/models/super-optimisation.model';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-super-optimiser',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CurrencyPipe,
    DecimalPipe,
    PercentPipe,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatIconModule,
    MatExpansionModule
  ],
  templateUrl: './super-optimiser.component.html',
  styleUrl: './super-optimiser.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuperOptimiserComponent implements OnInit {
  private fb = inject(FormBuilder);
  private superOptimiserService = inject(SuperOptimiserService);

  result = signal<SuperOptimisationResponse | null>(null);
  isLoading = signal(false);
  isPrefilling = signal(false);
  error = signal<string | null>(null);
  showAdvanced = signal(false);
  showSpouseSection = signal(false);

  // ✅ SG auto-calculation (approx) based on annual gross income + FY progress
  calculatedSgYtd = signal<number | null>(null);

  form: FormGroup = this.fb.group({
    // Required fields
    annualGrossIncome: [120000, [Validators.required, Validators.min(0)]],
    currentSuperBalance: [200000, [Validators.required, Validators.min(0)]],

    // Contributions YTD
    employerContributionsYtd: [0, [Validators.min(0)]],
    salarySacrificeYtd: [0, [Validators.min(0)]],
    personalConcessionalYtd: [0, [Validators.min(0)]],
    nonConcessionalYtd: [0, [Validators.min(0)]],

    // Advanced options
    totalSuperBalancePrevFy: [null, [Validators.min(0)]],
    marginalTaxRate: [null, [Validators.min(0), Validators.max(0.5)]],
    age: [null, [Validators.min(18), Validators.max(100)]],
    wantsToMaximiseContributions: [false],

    // Carry-forward (simplified - just total available)
    unusedConcessionalCapTotal: [0, [Validators.min(0)]],

    // Spouse details
    spouseIncome: [null, [Validators.min(0)]],
    spouseSuperBalance: [null, [Validators.min(0)]]
  });

  // Computed values from form
  totalConcessionalYtd = computed(() => {
    const employer = this.form.get('employerContributionsYtd')?.value || 0;
    const salary = this.form.get('salarySacrificeYtd')?.value || 0;
    const personal = this.form.get('personalConcessionalYtd')?.value || 0;
    return employer + salary + personal;
  });

  remainingCap = computed(() => {
    return Math.max(0, 30000 - this.totalConcessionalYtd());
  });

  // Computed values from result
  taxSaving = computed(() => this.result()?.estimatedTaxSaving ?? 0);
  suggestedContribution = computed(() => this.result()?.suggestedSalarySacrifice ?? 0);
  marginalRate = computed(() => (this.result()?.marginalTaxRate ?? 0) * 100);
  recommendations = computed(() => this.result()?.recommendations ?? []);
  warnings = computed(() => this.result()?.warnings ?? []);

  constructor() {
    // Auto-calculate on form changes
    this.form.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    ).subscribe(() => {
      // keep SG estimate up to date with income changes, but don't override user edits
      this.recalculateSgYtdAndMaybePrefill();

      if (this.form.valid) {
        this.calculate();
      }
    });
  }

  ngOnInit(): void {
    this.loadPrefillData();
  }

  /**
   * Australian FY runs July 1 to June 30.
   * Returns elapsed months in the current FY (1..12).
   */
  getMonthsElapsedInFy(): number {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0=Jan, 6=Jul
    return currentMonth >= 6 ? currentMonth - 6 + 1 : 6 + currentMonth + 1;
  }

  /**
   * Estimate SG YTD based on:
   * - annualGrossIncome
   * - months elapsed in current FY
   * - SG rate (assumed 12%)
   */
  private estimateSgYtdFromIncome(): number | null {
    const annualGrossIncome = Number(this.form.get('annualGrossIncome')?.value ?? 0);
    if (!Number.isFinite(annualGrossIncome) || annualGrossIncome <= 0) return null;

    const monthsElapsed = this.getMonthsElapsedInFy();

    // SG rate assumption
    const sgRate = 0.12;

    const annualSg = annualGrossIncome * sgRate;
    const sgYtd = Math.round((annualSg * monthsElapsed) / 12);

    return sgYtd;
  }

  /**
   * Prefill Employer SG (YTD) only if the user hasn't touched the field.
   * Avoids overriding manual entry.
   */
  private maybePrefillEmployerSg(sgYtd: number | null): void {
    if (sgYtd === null) return;

    const ctrl = this.form.get('employerContributionsYtd');
    if (!ctrl) return;

    // If user has typed, do not override.
    if (ctrl.dirty) return;

    const current = Number(ctrl.value ?? 0);

    // Only prefill when it’s empty/zero (default)
    if (!Number.isFinite(current) || current === 0) {
      ctrl.setValue(sgYtd, { emitEvent: false });
      ctrl.updateValueAndValidity({ emitEvent: false });
    }
  }

  /**
   * Recompute calculatedSgYtd and prefill employer SG when appropriate.
   */
  private recalculateSgYtdAndMaybePrefill(): void {
    const sgYtd = this.estimateSgYtdFromIncome();
    this.calculatedSgYtd.set(sgYtd);
    this.maybePrefillEmployerSg(sgYtd);
  }

  loadPrefillData(): void {
    this.isPrefilling.set(true);

    this.superOptimiserService.getPrefillData().subscribe({
      next: (data) => {
        if (data) {
          this.form.patchValue({
            annualGrossIncome: data.annualGrossIncome ?? this.form.get('annualGrossIncome')?.value,
            currentSuperBalance: data.currentSuperBalance ?? this.form.get('currentSuperBalance')?.value,

            // If backend has an exact/known value, keep it.
            // If it's missing, we'll estimate & prefill below.
            employerContributionsYtd: data.employerContributionsYtd ?? 0,

            salarySacrificeYtd: data.salarySacrificeYtd ?? 0,
            personalConcessionalYtd: data.personalConcessionalYtd ?? 0,
            nonConcessionalYtd: data.nonConcessionalYtd ?? 0,
            totalSuperBalancePrevFy: data.totalSuperBalancePrevFy,
            marginalTaxRate: data.marginalTaxRate,
            age: data.age
          });
        }

        // ✅ after we patch income, compute estimate and prefill if employer SG is still 0 and untouched
        this.recalculateSgYtdAndMaybePrefill();

        this.isPrefilling.set(false);
        this.calculate();
      },
      error: () => {
        // Even if prefill API fails, still estimate from current form values
        this.recalculateSgYtdAndMaybePrefill();

        this.isPrefilling.set(false);
        this.calculate();
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

    // Build unused caps array from the total
    const unusedCaps: number[] = [];
    if (formValue.unusedConcessionalCapTotal > 0) {
      unusedCaps.push(formValue.unusedConcessionalCapTotal);
    }

    const request: SuperOptimisationRequest = {
      annualGrossIncome: formValue.annualGrossIncome,
      currentSuperBalance: formValue.currentSuperBalance,
      totalSuperBalancePrevFy: formValue.totalSuperBalancePrevFy || undefined,
      employerContributionsYtd: formValue.employerContributionsYtd || 0,
      salarySacrificeYtd: formValue.salarySacrificeYtd || 0,
      personalConcessionalYtd: formValue.personalConcessionalYtd || 0,
      nonConcessionalYtd: formValue.nonConcessionalYtd || 0,
      marginalTaxRate: formValue.marginalTaxRate || undefined,
      spouseIncome: formValue.spouseIncome || undefined,
      spouseSuperBalance: formValue.spouseSuperBalance || undefined,
      age: formValue.age || undefined,
      unusedConcessionalCaps: unusedCaps.length > 0 ? unusedCaps : undefined,
      wantsToMaximiseContributions: formValue.wantsToMaximiseContributions || false
    };

    this.superOptimiserService.analyse(request).subscribe({
      next: (response) => {
        this.result.set(response);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Super optimisation failed:', err);
        this.error.set(err.error?.message || 'Analysis failed. Please check your inputs.');
        this.isLoading.set(false);
      }
    });
  }

  toggleAdvanced(): void {
    this.showAdvanced.update(v => !v);
  }

  toggleSpouseSection(): void {
    this.showSpouseSection.update(v => !v);
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
    return (value * 100).toFixed(0) + '%';
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'HIGH': return 'priority-high';
      case 'MEDIUM': return 'priority-medium';
      case 'LOW': return 'priority-low';
      default: return '';
    }
  }

  getProgressPercent(): number {
    const ytd = this.totalConcessionalYtd();
    return Math.min((ytd / 30000) * 100, 100);
  }

  getSuperTaxExplanation(): string {
    const result = this.result();
    if (!result) return '';

    if (result.subjectToDiv293) {
      return 'Your contributions are taxed at 30% (15% standard + 15% Division 293)';
    }
    return 'Your contributions are taxed at 15% in super';
  }
}
