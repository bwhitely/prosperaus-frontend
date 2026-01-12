import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { filter, switchMap } from 'rxjs/operators';
import { SuperAccountService } from '../../core/services/super-account.service';
import { IncomeService } from '../../core/services/income.service';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { SuperAccountRequest, SuperAccountResponse } from '../../shared/models/super-account.model';
import { IncomeSourceResponse } from '../../shared/models/cash-flow.model';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-super-accounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, DatePipe, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './super-accounts.component.html',
  styleUrl: './super-accounts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuperAccountsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private superService = inject(SuperAccountService);
  private incomeService = inject(IncomeService);
  private confirmDialog = inject(ConfirmDialogService);

  accounts = signal<SuperAccountResponse[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  showForm = signal(false);
  editingAccount = signal<SuperAccountResponse | null>(null);
  isSubmitting = signal(false);
  showAdvanced = signal(false);

  // For SG auto-calculation
  salaryIncome = signal<IncomeSourceResponse[]>([]);
  calculatedSgYtd = signal<number | null>(null);

  form: FormGroup = this.fb.group({
    fundName: ['', [Validators.required, Validators.maxLength(100)]],
    balance: [null, [Validators.required, Validators.min(0)]],
    balanceDate: [''],
    employerContributionsYtd: [0],
    salarySacrificeYtd: [0],
    personalConcessionalYtd: [0],
    nonConcessionalYtd: [0],
    totalSuperBalancePrevFy: [null],
    hasInsurance: [false],
    insurancePremiumPa: [null]
  });

  // Common super funds for autocomplete
  commonFunds = [
    'AustralianSuper',
    'Australian Retirement Trust',
    'Aware Super',
    'Hostplus',
    'Rest',
    'UniSuper',
    'HESTA',
    'Cbus',
    'VicSuper',
    'First State Super'
  ];

  ngOnInit(): void {
    this.loadAccounts();
    this.loadSalaryIncome();
  }

  /**
   * Load salary income sources for SG calculation
   */
  loadSalaryIncome(): void {
    this.incomeService.getActive().subscribe({
      next: (incomes) => {
        const salaries = incomes.filter(i => i.sourceType === 'salary');
        this.salaryIncome.set(salaries);
        this.calculateSgYtd();
      },
      error: () => {
        // Silent fail - SG calculation is optional
      }
    });
  }

  /**
   * Calculate YTD employer (SG) contributions based on salary and FY progress.
   * Australian FY runs July 1 to June 30.
   * SG rate is 12% from July 2025.
   */
  calculateSgYtd(): void {
    const salaries = this.salaryIncome();
    if (salaries.length === 0) {
      this.calculatedSgYtd.set(null);
      return;
    }

    // Sum all annual salary income
    const totalAnnualSalary = salaries.reduce((sum, s) => sum + s.annualisedAmount, 0);

    // Calculate annual SG (12%)
    const sgRate = 0.12;
    const annualSg = totalAnnualSalary * sgRate;

    // Calculate months elapsed in current FY
    const now = new Date();
    const currentMonth = now.getMonth(); // 0 = Jan, 6 = July
    const currentYear = now.getFullYear();

    // FY starts in July (month 6)
    // If current month >= July, we're in FY that started this year
    // Otherwise, FY started last July
    let monthsElapsed: number;
    if (currentMonth >= 6) {
      // July onwards - count from July this year
      monthsElapsed = currentMonth - 6 + 1; // +1 because we include current month
    } else {
      // Jan-June - count from July last year (6 months) + months this year
      monthsElapsed = 6 + currentMonth + 1;
    }

    // Pro-rate the annual SG
    const sgYtd = Math.round((annualSg * monthsElapsed) / 12);
    this.calculatedSgYtd.set(sgYtd);
  }

  loadAccounts(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.superService.getAll().subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load super accounts');
        this.isLoading.set(false);
      }
    });
  }

  getTotalBalance(): number {
    return this.accounts().reduce((sum, a) => sum + a.balance, 0);
  }

  getTotalConcessionalYtd(): number {
    return this.accounts().reduce((sum, a) => sum + a.totalConcessionalYtd, 0);
  }

  getConcessionalRemaining(): number {
    const cap = 30000; // FY25-26 concessional cap
    return Math.max(0, cap - this.getTotalConcessionalYtd());
  }

  openAddForm(): void {
    this.editingAccount.set(null);

    // Pre-fill employer SG if calculated
    const sgYtd = this.calculatedSgYtd();

    this.form.reset({
      employerContributionsYtd: sgYtd ?? 0,
      salarySacrificeYtd: 0,
      personalConcessionalYtd: 0,
      nonConcessionalYtd: 0,
      hasInsurance: false
    });

    // Auto-expand advanced section if we have SG to show
    this.showAdvanced.set(sgYtd !== null && sgYtd > 0);
    this.showForm.set(true);
  }

  openEditForm(account: SuperAccountResponse): void {
    this.editingAccount.set(account);
    this.form.patchValue({
      fundName: account.fundName,
      balance: account.balance,
      balanceDate: account.balanceDate || '',
      employerContributionsYtd: account.employerContributionsYtd,
      salarySacrificeYtd: account.salarySacrificeYtd,
      personalConcessionalYtd: account.personalConcessionalYtd,
      nonConcessionalYtd: account.nonConcessionalYtd,
      totalSuperBalancePrevFy: account.totalSuperBalancePrevFy,
      hasInsurance: account.hasInsurance,
      insurancePremiumPa: account.insurancePremiumPa
    });
    this.showAdvanced.set(true);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingAccount.set(null);
  }

  save(): void {
    if (this.form.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const formValue = this.form.value;

    const request: SuperAccountRequest = {
      fundName: formValue.fundName,
      balance: formValue.balance,
      balanceDate: formValue.balanceDate || undefined,
      employerContributionsYtd: formValue.employerContributionsYtd || 0,
      salarySacrificeYtd: formValue.salarySacrificeYtd || 0,
      personalConcessionalYtd: formValue.personalConcessionalYtd || 0,
      nonConcessionalYtd: formValue.nonConcessionalYtd || 0,
      totalSuperBalancePrevFy: formValue.totalSuperBalancePrevFy || undefined,
      hasInsurance: formValue.hasInsurance,
      insurancePremiumPa: formValue.insurancePremiumPa || undefined
    };

    const editing = this.editingAccount();
    const operation = editing
      ? this.superService.update(editing.id, request)
      : this.superService.create(request);

    operation.subscribe({
      next: () => {
        this.loadAccounts();
        this.closeForm();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to save super account');
        this.isSubmitting.set(false);
      }
    });
  }

  delete(account: SuperAccountResponse): void {
    this.confirmDialog.confirmDelete(account.fundName)
      .pipe(
        filter(confirmed => confirmed),
        switchMap(() => this.superService.delete(account.id))
      )
      .subscribe({
        next: () => this.loadAccounts(),
        error: () => this.error.set('Failed to delete super account')
      });
  }

  toggleAdvanced(): void {
    this.showAdvanced.update(v => !v);
  }

  /**
   * Get the number of months elapsed in the current FY for display purposes.
   */
  getMonthsElapsedInFy(): number {
    const now = new Date();
    const currentMonth = now.getMonth();

    if (currentMonth >= 6) {
      return currentMonth - 6 + 1;
    } else {
      return 6 + currentMonth + 1;
    }
  }
}
