import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BankStatementService } from '../../../../core/services/bank-statement.service';
import { ExpenseService } from '../../../../core/services/expense.service';
import {
  DetectedIncome,
  DetectedExpense,
  MigrationPreviewResponse,
  MigrationApplyRequest,
  IncomeToCreate,
  ExpenseToCreate,
  ExpenseCategoryResponse,
  IncomeFrequency,
  ExpenseFrequency
} from '../../../../shared/models/cash-flow.model';

type DialogStep = 'loading' | 'preview' | 'applying' | 'success' | 'error';

const FREQUENCY_OPTIONS: { value: string; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' }
];

const SOURCE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'salary', label: 'Salary' },
  { value: 'dividends', label: 'Dividends' },
  { value: 'rental', label: 'Rental Income' },
  { value: 'interest', label: 'Interest' },
  { value: 'government', label: 'Government Payment' },
  { value: 'refund', label: 'Refund' },
  { value: 'other', label: 'Other' }
];

@Component({
  selector: 'app-migration-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    CurrencyPipe
  ],
  templateUrl: './migration-dialog.component.html',
  styleUrl: './migration-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MigrationDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<MigrationDialogComponent>);
  private statementService = inject(BankStatementService);
  private expenseService = inject(ExpenseService);

  // State
  step = signal<DialogStep>('loading');
  error = signal<string | null>(null);
  categories = signal<ExpenseCategoryResponse[]>([]);

  // Editable data
  editableIncome = signal<DetectedIncome[]>([]);
  editableExpenses = signal<DetectedExpense[]>([]);

  // Original preview response
  previewResponse = signal<MigrationPreviewResponse | null>(null);

  // Options
  frequencyOptions = FREQUENCY_OPTIONS;
  sourceTypeOptions = SOURCE_TYPE_OPTIONS;

  // Computed totals
  totalMonthlyIncome = computed(() => {
    return this.editableIncome().reduce((sum, income) => {
      return sum + this.toMonthlyAmount(income.amount, income.frequency);
    }, 0);
  });

  totalMonthlyExpenses = computed(() => {
    return this.editableExpenses().reduce((sum, expense) => {
      return sum + this.toMonthlyAmount(expense.amount, expense.frequency);
    }, 0);
  });

  monthlySurplus = computed(() => {
    return this.totalMonthlyIncome() - this.totalMonthlyExpenses();
  });

  ngOnInit(): void {
    this.loadPreview();
  }

  loadPreview(): void {
    this.step.set('loading');
    this.error.set(null);

    // Load categories first, then preview
    this.expenseService.getCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);

        this.statementService.getMigrationPreview().subscribe({
          next: (response) => {
            this.previewResponse.set(response);
            this.editableIncome.set([...response.detectedIncome]);
            this.editableExpenses.set([...response.detectedExpenses]);
            this.step.set('preview');
          },
          error: (err) => {
            this.error.set(err.error?.message || 'Failed to load migration preview');
            this.step.set('error');
          }
        });
      },
      error: () => {
        this.error.set('Failed to load categories');
        this.step.set('error');
      }
    });
  }

  // Income editing
  updateIncomeName(index: number, name: string): void {
    this.updateIncome(index, { name });
  }

  updateIncomeAmount(index: number, amount: number): void {
    this.updateIncome(index, { amount });
  }

  updateIncomeFrequency(index: number, frequency: string): void {
    this.updateIncome(index, { frequency: frequency as IncomeFrequency });
  }

  updateIncomeSourceType(index: number, sourceType: string): void {
    this.updateIncome(index, { sourceType });
  }

  removeIncome(index: number): void {
    const current = this.editableIncome();
    this.editableIncome.set([...current.slice(0, index), ...current.slice(index + 1)]);
  }

  private updateIncome(index: number, updates: Partial<DetectedIncome>): void {
    const current = this.editableIncome();
    const updated = { ...current[index], ...updates };
    this.editableIncome.set([...current.slice(0, index), updated, ...current.slice(index + 1)]);
  }

  // Expense editing
  updateExpenseName(index: number, name: string): void {
    this.updateExpense(index, { name });
  }

  updateExpenseAmount(index: number, amount: number): void {
    this.updateExpense(index, { amount });
  }

  updateExpenseFrequency(index: number, frequency: string): void {
    this.updateExpense(index, { frequency: frequency as ExpenseFrequency });
  }

  updateExpenseCategory(index: number, categoryId: string): void {
    const category = this.categories().find(c => c.id === categoryId);
    this.updateExpense(index, {
      categoryId: categoryId || undefined,
      categoryName: category?.name
    });
  }

  removeExpense(index: number): void {
    const current = this.editableExpenses();
    this.editableExpenses.set([...current.slice(0, index), ...current.slice(index + 1)]);
  }

  private updateExpense(index: number, updates: Partial<DetectedExpense>): void {
    const current = this.editableExpenses();
    const updated = { ...current[index], ...updates };
    this.editableExpenses.set([...current.slice(0, index), updated, ...current.slice(index + 1)]);
  }

  // Apply migration
  applyMigration(): void {
    this.step.set('applying');
    this.error.set(null);

    const request: MigrationApplyRequest = {
      incomeSources: this.editableIncome().map(i => ({
        name: i.name,
        sourceType: i.sourceType,
        grossAmount: i.amount,
        frequency: i.frequency,
        notes: `Migrated from ${i.transactionCount} bank transactions`
      } as IncomeToCreate)),
      expenses: this.editableExpenses().map(e => ({
        name: e.name,
        categoryId: e.categoryId,
        amount: e.amount,
        frequency: e.frequency,
        isRecurring: e.isRecurring,
        notes: `Migrated from ${e.transactionCount} bank transactions`
      } as ExpenseToCreate)),
      confirmReplace: true
    };

    this.statementService.applyMigration(request).subscribe({
      next: () => {
        this.step.set('success');
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to apply migration');
        this.step.set('error');
      }
    });
  }

  close(): void {
    this.dialogRef.close(this.step() === 'success');
  }

  retry(): void {
    this.loadPreview();
  }

  private toMonthlyAmount(amount: number, frequency: string): number {
    switch (frequency) {
      case 'weekly': return amount * 52 / 12;
      case 'fortnightly': return amount * 26 / 12;
      case 'monthly': return amount;
      case 'quarterly': return amount / 3;
      case 'annually': return amount / 12;
      default: return amount;
    }
  }
}
