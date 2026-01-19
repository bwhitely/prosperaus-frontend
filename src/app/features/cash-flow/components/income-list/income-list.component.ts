import { Component, ChangeDetectionStrategy, inject, signal, OnInit, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { filter, switchMap } from 'rxjs/operators';
import { IncomeService } from '../../../../core/services/income.service';
import { CashLiabilityService } from '../../../../core/services/cash-liability.service';
import { ConfirmDialogService } from '../../../../shared/services/confirm-dialog.service';
import { IncomeSourceRequest, IncomeSourceResponse, IncomeFrequency } from '../../../../shared/models/cash-flow.model';
import { LiabilityResponse } from '../../../../shared/models/cash-liability.model';
import { calculateCappedHecsRepayment } from '../../../../core/constants/australian-tax.constants';
import { MatTooltip } from "@angular/material/tooltip";
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

// Australian FY25-26 Tax Brackets (Stage 3 tax cuts)
interface TaxBracket {
  min: number;
  max: number;
  rate: number;
  base: number;
}

const TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 18200, rate: 0, base: 0 },
  { min: 18201, max: 45000, rate: 0.16, base: 0 },
  { min: 45001, max: 135000, rate: 0.30, base: 4288 },
  { min: 135001, max: 190000, rate: 0.37, base: 31288 },
  { min: 190001, max: Infinity, rate: 0.45, base: 51638 }
];

const MEDICARE_LEVY_RATE = 0.02;

@Component({
  selector: 'app-income-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, MatTooltip, MatIconModule, MatButtonModule],
  templateUrl: './income-list.component.html',
  styleUrl: './income-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IncomeListComponent implements OnInit {
  @Output() changed = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private incomeService = inject(IncomeService);
  private liabilityService = inject(CashLiabilityService);
  private confirmDialog = inject(ConfirmDialogService);

  incomeSources = signal<IncomeSourceResponse[]>([]);
  hecsLiabilities = signal<LiabilityResponse[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  showForm = signal(false);
  editingSource = signal<IncomeSourceResponse | null>(null);
  isSubmitting = signal(false);

  // Computed totals
  totalAnnualGross = computed(() =>
    this.incomeSources().reduce((sum, s) => sum + this.getAnnualAmount(s), 0)
  );

  totalAnnualTax = computed(() => this.calculateTax(this.totalAnnualGross()));

  // HECS debt and repayment calculations
  hecsBalance = computed(() =>
    this.hecsLiabilities().reduce((sum, l) => sum + l.balance, 0)
  );

  annualHecsRepayment = computed(() =>
    calculateCappedHecsRepayment(this.totalAnnualGross(), this.hecsBalance())
  );

  totalAnnualNet = computed(() =>
    this.totalAnnualGross() - this.totalAnnualTax() - this.annualHecsRepayment()
  );

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    sourceType: ['salary', Validators.required],
    grossAmount: [null, [Validators.required, Validators.min(0.01)]],
    frequency: ['monthly', Validators.required],
    notes: ['']
  });

  frequencies: { value: IncomeFrequency; label: string }[] = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'fortnightly', label: 'Fortnightly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'annually', label: 'Annually' }
  ];

  commonSourceTypes = [
    'salary',
    'bonus',
    'dividends',
    'rental',
    'business',
    'interest',
    'pension',
    'government',
    'side_hustle',
    'other'
  ];

  ngOnInit(): void {
    this.loadIncomeSources();
    this.loadHecsLiabilities();
  }

  loadIncomeSources(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.incomeService.getAll().subscribe({
      next: (sources) => {
        this.incomeSources.set(sources);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load income sources');
        this.isLoading.set(false);
      }
    });
  }

  loadHecsLiabilities(): void {
    this.liabilityService.getLiabilities().subscribe({
      next: (liabilities) => {
        // Filter for HECS/HELP debts only
        const hecsDebts = liabilities.filter(l => l.liabilityType === 'hecs_help');
        const previousHecsBalance = this.hecsBalance();
        this.hecsLiabilities.set(hecsDebts);

        // If HECS balance changed, notify parent to refresh summary (for savings rate)
        const newHecsBalance = hecsDebts.reduce((sum, l) => sum + l.balance, 0);
        if (newHecsBalance !== previousHecsBalance) {
          this.changed.emit();
        }
      },
      error: () => {
        // Silently fail - HECS is supplementary info
        this.hecsLiabilities.set([]);
      }
    });
  }

  // Calculate Australian income tax for a given annual income
  calculateTax(annualIncome: number): number {
    if (annualIncome <= 0) return 0;

    let tax = 0;

    // Find the applicable tax bracket
    for (const bracket of TAX_BRACKETS) {
      if (annualIncome >= bracket.min && annualIncome <= bracket.max) {
        tax = bracket.base + (annualIncome - bracket.min + 1) * bracket.rate;
        break;
      }
    }

    // Add Medicare Levy (2%)
    tax += annualIncome * MEDICARE_LEVY_RATE;

    return Math.round(tax);
  }

  // Convert income to annual amount based on frequency
  getAnnualAmount(source: IncomeSourceResponse): number {
    const multipliers: Record<string, number> = {
      'weekly': 52,
      'fortnightly': 26,
      'monthly': 12,
      'quarterly': 4,
      'annually': 1
    };
    return source.grossAmount * (multipliers[source.frequency] || 12);
  }

  // Get amounts at different frequencies for display
  getIncomeBreakdown(source: IncomeSourceResponse): { fortnightly: number; monthly: number; annually: number } {
    const annual = this.getAnnualAmount(source);
    return {
      fortnightly: annual / 26,
      monthly: annual / 12,
      annually: annual
    };
  }

  openAddForm(): void {
    this.editingSource.set(null);
    this.form.reset({
      sourceType: 'salary',
      frequency: 'monthly'
    });
    this.showForm.set(true);
  }

  openEditForm(source: IncomeSourceResponse): void {
    this.editingSource.set(source);
    this.form.patchValue({
      name: source.name,
      sourceType: source.sourceType,
      grossAmount: source.grossAmount,
      frequency: source.frequency,
      notes: source.notes || ''
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingSource.set(null);
  }

  save(): void {
    if (this.form.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const formValue = this.form.value;

    const request: IncomeSourceRequest = {
      name: formValue.name,
      sourceType: formValue.sourceType,
      grossAmount: formValue.grossAmount,
      frequency: formValue.frequency,
      isActive: true, // Always active
      notes: formValue.notes || undefined
    };

    const editing = this.editingSource();
    const operation = editing
      ? this.incomeService.update(editing.id, request)
      : this.incomeService.create(request);

    operation.subscribe({
      next: () => {
        this.loadIncomeSources();
        this.closeForm();
        this.isSubmitting.set(false);
        this.changed.emit();
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to save income source');
        this.isSubmitting.set(false);
      }
    });
  }

  delete(source: IncomeSourceResponse): void {
    this.confirmDialog.confirmDelete(source.name)
      .pipe(
        filter(confirmed => confirmed),
        switchMap(() => this.incomeService.delete(source.id))
      )
      .subscribe({
        next: () => {
          this.loadIncomeSources();
          this.changed.emit();
        },
      error: () => this.error.set('Failed to delete income source')
    });
  }

  formatFrequency(freq: string): string {
    const map: Record<string, string> = {
      'weekly': '/wk',
      'fortnightly': '/fn',
      'monthly': '/mo',
      'quarterly': '/qtr',
      'annually': '/yr'
    };
    return map[freq] || '';
  }

  formatSourceType(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
  }
}
