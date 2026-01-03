import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CashLiabilityService } from '../../core/services/cash-liability.service';
import {
  CashAccountRequest, CashAccountResponse,
  LiabilityRequest, LiabilityResponse, LiabilityType
} from '../../shared/models/cash-liability.model';

@Component({
  selector: 'app-cash-liabilities',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './cash-liabilities.component.html',
  styleUrl: './cash-liabilities.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CashLiabilitiesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(CashLiabilityService);

  activeTab = signal<'cash' | 'liabilities'>('cash');

  cashAccounts = signal<CashAccountResponse[]>([]);
  liabilities = signal<LiabilityResponse[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  showCashForm = signal(false);
  showLiabilityForm = signal(false);
  editingCash = signal<CashAccountResponse | null>(null);
  editingLiability = signal<LiabilityResponse | null>(null);
  isSubmitting = signal(false);

  cashForm: FormGroup = this.fb.group({
    accountName: ['', [Validators.required, Validators.maxLength(100)]],
    balance: [null, [Validators.required, Validators.min(0)]],
    accountType: ['savings'],
    institution: [''],
    interestRate: [null],
    bonusRate: [null],
    bonusConditions: [''],
    maturityDate: [''],
    principal: [null],
    linkedMortgageId: ['']
  });

  liabilityForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    balance: [null, [Validators.required, Validators.min(0)]],
    liabilityType: ['personal_loan'],
    interestRate: [null],
    minimumRepayment: [null],
    institution: [''],
    // Credit card fields
    creditLimit: [null],
    dueDate: [null],
    statementDate: [null],
    annualFee: [null],
    // Loan fields
    originalAmount: [null],
    termMonths: [null],
    startDate: ['']
  });

  accountTypes = [
    { value: 'transaction', label: 'Everyday Account' },
    { value: 'savings', label: 'Savings Account' },
    { value: 'term_deposit', label: 'Term Deposit' },
    { value: 'offset', label: 'Offset Account' },
    { value: 'other', label: 'Other' }
  ];

  liabilityTypes = [
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'personal_loan', label: 'Personal Loan' },
    { value: 'car_loan', label: 'Car Loan' },
    { value: 'hecs_help', label: 'HECS/HELP' },
    { value: 'margin_loan', label: 'Margin Loan' },
    { value: 'other', label: 'Other Debt' }
  ];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    // Load both in parallel
    this.service.getCashAccounts().subscribe({
      next: (accounts) => this.cashAccounts.set(accounts),
      error: () => this.error.set('Failed to load cash accounts')
    });

    this.service.getLiabilities().subscribe({
      next: (liabilities) => {
        this.liabilities.set(liabilities);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load liabilities');
        this.isLoading.set(false);
      }
    });
  }

  setTab(tab: 'cash' | 'liabilities'): void {
    this.activeTab.set(tab);
  }

  getTotalCash(): number {
    return this.cashAccounts().reduce((sum, a) => sum + a.balance, 0);
  }

  getTotalLiabilities(): number {
    return this.liabilities().reduce((sum, l) => sum + l.balance, 0);
  }

  // Cash Account Form
  openAddCashForm(): void {
    this.editingCash.set(null);
    this.cashForm.reset({ accountType: 'savings' });
    this.showCashForm.set(true);
  }

  openEditCashForm(account: CashAccountResponse): void {
    this.editingCash.set(account);
    this.cashForm.patchValue({
      accountName: account.accountName,
      balance: account.balance,
      accountType: account.accountType,
      institution: account.institution || '',
      interestRate: account.interestRate ? account.interestRate * 100 : null,
      bonusRate: account.bonusRate ? account.bonusRate * 100 : null,
      bonusConditions: account.bonusConditions || '',
      maturityDate: account.maturityDate || '',
      principal: account.principal,
      linkedMortgageId: account.linkedMortgageId || ''
    });
    this.showCashForm.set(true);
  }

  closeCashForm(): void {
    this.showCashForm.set(false);
    this.editingCash.set(null);
  }

  saveCashAccount(): void {
    if (this.cashForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const formValue = this.cashForm.value;

    const request: CashAccountRequest = {
      accountName: formValue.accountName,
      balance: formValue.balance,
      accountType: formValue.accountType,
      institution: formValue.institution || undefined,
      interestRate: formValue.interestRate ? formValue.interestRate / 100 : undefined,
      bonusRate: formValue.bonusRate ? formValue.bonusRate / 100 : undefined,
      bonusConditions: formValue.bonusConditions || undefined,
      maturityDate: formValue.maturityDate || undefined,
      principal: formValue.principal || undefined,
      linkedMortgageId: formValue.linkedMortgageId || undefined
    };

    const editing = this.editingCash();
    const operation = editing
      ? this.service.updateCashAccount(editing.id, request)
      : this.service.createCashAccount(request);

    operation.subscribe({
      next: () => {
        this.loadData();
        this.closeCashForm();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to save cash account');
        this.isSubmitting.set(false);
      }
    });
  }

  deleteCashAccount(account: CashAccountResponse): void {
    if (!confirm(`Delete "${account.accountName}"?`)) return;

    this.service.deleteCashAccount(account.id).subscribe({
      next: () => this.loadData(),
      error: () => this.error.set('Failed to delete cash account')
    });
  }

  // Liability Form
  openAddLiabilityForm(): void {
    this.editingLiability.set(null);
    this.liabilityForm.reset({ liabilityType: 'personal_loan' });
    this.showLiabilityForm.set(true);
  }

  openEditLiabilityForm(liability: LiabilityResponse): void {
    this.editingLiability.set(liability);
    this.liabilityForm.patchValue({
      name: liability.name,
      balance: liability.balance,
      liabilityType: liability.liabilityType,
      interestRate: liability.interestRate ? liability.interestRate * 100 : null,
      minimumRepayment: liability.minimumRepayment,
      institution: liability.institution || '',
      creditLimit: liability.creditLimit,
      dueDate: liability.dueDate,
      statementDate: liability.statementDate,
      annualFee: liability.annualFee,
      originalAmount: liability.originalAmount,
      termMonths: liability.termMonths,
      startDate: liability.startDate || ''
    });
    this.showLiabilityForm.set(true);
  }

  closeLiabilityForm(): void {
    this.showLiabilityForm.set(false);
    this.editingLiability.set(null);
  }

  saveLiability(): void {
    if (this.liabilityForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const formValue = this.liabilityForm.value;

    const request: LiabilityRequest = {
      name: formValue.name,
      balance: formValue.balance,
      liabilityType: formValue.liabilityType as LiabilityType,
      interestRate: formValue.interestRate ? formValue.interestRate / 100 : undefined,
      minimumRepayment: formValue.minimumRepayment || undefined,
      institution: formValue.institution || undefined,
      creditLimit: formValue.creditLimit || undefined,
      dueDate: formValue.dueDate || undefined,
      statementDate: formValue.statementDate || undefined,
      annualFee: formValue.annualFee || undefined,
      originalAmount: formValue.originalAmount || undefined,
      termMonths: formValue.termMonths || undefined,
      startDate: formValue.startDate || undefined
    };

    const editing = this.editingLiability();
    const operation = editing
      ? this.service.updateLiability(editing.id, request)
      : this.service.createLiability(request);

    operation.subscribe({
      next: () => {
        this.loadData();
        this.closeLiabilityForm();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to save liability');
        this.isSubmitting.set(false);
      }
    });
  }

  deleteLiability(liability: LiabilityResponse): void {
    if (!confirm(`Delete "${liability.name}"?`)) return;

    this.service.deleteLiability(liability.id).subscribe({
      next: () => this.loadData(),
      error: () => this.error.set('Failed to delete liability')
    });
  }

  getLiabilityTypeLabel(type: string): string {
    return this.liabilityTypes.find(t => t.value === type)?.label || type;
  }

  getAccountTypeLabel(type: string): string {
    return this.accountTypes.find(t => t.value === type)?.label || type;
  }

  isCreditCard(liabilityType: string): boolean {
    return liabilityType === 'credit_card';
  }

  isTermDeposit(accountType: string): boolean {
    return accountType === 'term_deposit';
  }

  isSavingsWithBonus(accountType: string): boolean {
    return accountType === 'savings';
  }

  isOffset(accountType: string): boolean {
    return accountType === 'offset';
  }
}
