import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SuperAccountService } from '../../core/services/super-account.service';
import { SuperAccountRequest, SuperAccountResponse } from '../../shared/models/super-account.model';

@Component({
  selector: 'app-super-accounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, DatePipe],
  templateUrl: './super-accounts.component.html',
  styleUrl: './super-accounts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuperAccountsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private superService = inject(SuperAccountService);

  accounts = signal<SuperAccountResponse[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  showModal = signal(false);
  editingAccount = signal<SuperAccountResponse | null>(null);
  isSubmitting = signal(false);
  showAdvanced = signal(false);

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

  openAddModal(): void {
    this.editingAccount.set(null);
    this.form.reset({
      employerContributionsYtd: 0,
      salarySacrificeYtd: 0,
      personalConcessionalYtd: 0,
      nonConcessionalYtd: 0,
      hasInsurance: false
    });
    this.showAdvanced.set(false);
    this.showModal.set(true);
  }

  openEditModal(account: SuperAccountResponse): void {
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
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
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
        this.closeModal();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to save super account');
        this.isSubmitting.set(false);
      }
    });
  }

  delete(account: SuperAccountResponse): void {
    if (!confirm(`Are you sure you want to delete "${account.fundName}"?`)) {
      return;
    }

    this.superService.delete(account.id).subscribe({
      next: () => this.loadAccounts(),
      error: () => this.error.set('Failed to delete super account')
    });
  }

  toggleAdvanced(): void {
    this.showAdvanced.update(v => !v);
  }
}
