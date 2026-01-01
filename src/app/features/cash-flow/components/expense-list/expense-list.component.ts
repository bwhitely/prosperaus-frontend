import { Component, ChangeDetectionStrategy, inject, signal, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ExpenseService } from '../../../../core/services/expense.service';
import {
  UserExpenseRequest,
  UserExpenseResponse,
  ExpenseCategoryResponse,
  ExpenseCategoryRequest,
  ExpenseFrequency
} from '../../../../shared/models/cash-flow.model';

@Component({
  selector: 'app-expense-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CurrencyPipe,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './expense-list.component.html',
  styleUrls: ['./expense-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpenseListComponent implements OnInit {
  @Output() changed = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private expenseService = inject(ExpenseService);

  expenses = signal<UserExpenseResponse[]>([]);
  categories = signal<ExpenseCategoryResponse[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Expense form
  showExpenseForm = signal(false);
  editingExpense = signal<UserExpenseResponse | null>(null);
  isSubmitting = signal(false);

  // Category form
  showCategoryForm = signal(false);
  editingCategory = signal<ExpenseCategoryResponse | null>(null);
  isCategorySubmitting = signal(false);

  expenseForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    categoryId: [''],
    amount: [null, [Validators.required, Validators.min(0.01)]],
    frequency: ['monthly', Validators.required],
    isRecurring: [true],
    startDate: [''],
    endDate: [''],
    notes: ['']
  });

  categoryForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
    icon: [''],
    color: ['#4A90A4'],
    displayOrder: [0]
  });

  frequencies: { value: ExpenseFrequency; label: string }[] = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'fortnightly', label: 'Fortnightly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'annually', label: 'Annually' },
    { value: 'one_off', label: 'One-off' }
  ];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    Promise.all([
      this.expenseService.getExpenses().toPromise(),
      this.expenseService.getCategories().toPromise()
    ]).then(([expenses, categories]) => {
      this.expenses.set(expenses || []);
      this.categories.set(categories || []);
      this.isLoading.set(false);
    }).catch(() => {
      this.error.set('Failed to load expenses');
      this.isLoading.set(false);
    });
  }

  getExpensesByCategory(): { category: ExpenseCategoryResponse | null; expenses: UserExpenseResponse[] }[] {
    const expenseList = this.expenses();
    const categoryList = this.categories();
    const categoryMap = new Map<string | null, UserExpenseResponse[]>();

    // Group expenses by category
    for (const expense of expenseList) {
      const key = expense.categoryId || null;
      if (!categoryMap.has(key)) {
        categoryMap.set(key, []);
      }
      categoryMap.get(key)!.push(expense);
    }

    // Convert to array with category objects
    const result: { category: ExpenseCategoryResponse | null; expenses: UserExpenseResponse[] }[] = [];

    // Add categorised expenses
    for (const category of categoryList) {
      const catExpenses = categoryMap.get(category.id);
      if (catExpenses && catExpenses.length > 0) {
        result.push({ category, expenses: catExpenses });
      }
    }

    // Add uncategorised expenses
    const uncategorised = categoryMap.get(null);
    if (uncategorised && uncategorised.length > 0) {
      result.push({ category: null, expenses: uncategorised });
    }

    return result;
  }

  getTotalMonthly(): number {
    return this.expenses()
      .filter(e => e.isRecurring)
      .reduce((sum, e) => sum + e.monthlyAmount, 0);
  }

  getCategoryTotal(expenses: UserExpenseResponse[]): number {
    return expenses
      .filter(e => e.isRecurring)
      .reduce((sum, e) => sum + e.monthlyAmount, 0);
  }

  // Expense methods

  openAddExpenseForm(): void {
    this.editingExpense.set(null);
    this.expenseForm.reset({
      frequency: 'monthly',
      isRecurring: true
    });
    this.showExpenseForm.set(true);
  }

  openEditExpenseForm(expense: UserExpenseResponse): void {
    this.editingExpense.set(expense);
    this.expenseForm.patchValue({
      name: expense.name,
      categoryId: expense.categoryId || '',
      amount: expense.amount,
      frequency: expense.frequency,
      isRecurring: expense.isRecurring,
      startDate: expense.startDate || '',
      endDate: expense.endDate || '',
      notes: expense.notes || ''
    });
    this.showExpenseForm.set(true);
  }

  closeExpenseForm(): void {
    this.showExpenseForm.set(false);
    this.editingExpense.set(null);
  }

  saveExpense(): void {
    if (this.expenseForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const formValue = this.expenseForm.value;

    const request: UserExpenseRequest = {
      name: formValue.name,
      categoryId: formValue.categoryId || undefined,
      amount: formValue.amount,
      frequency: formValue.frequency,
      isRecurring: formValue.isRecurring,
      startDate: formValue.startDate || undefined,
      endDate: formValue.endDate || undefined,
      notes: formValue.notes || undefined
    };

    const editing = this.editingExpense();
    const operation = editing
      ? this.expenseService.updateExpense(editing.id, request)
      : this.expenseService.createExpense(request);

    operation.subscribe({
      next: () => {
        this.loadData();
        this.closeExpenseForm();
        this.isSubmitting.set(false);
        this.changed.emit();
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to save expense');
        this.isSubmitting.set(false);
      }
    });
  }

  deleteExpense(expense: UserExpenseResponse): void {
    if (!confirm(`Are you sure you want to delete "${expense.name}"?`)) {
      return;
    }

    this.expenseService.deleteExpense(expense.id).subscribe({
      next: () => {
        this.loadData();
        this.changed.emit();
      },
      error: () => this.error.set('Failed to delete expense')
    });
  }

  // Category methods

  openCategoryForm(): void {
    this.editingCategory.set(null);
    this.categoryForm.reset({
      color: '#4A90A4',
      displayOrder: 0
    });
    this.showCategoryForm.set(true);
  }

  openEditCategoryForm(category: ExpenseCategoryResponse): void {
    if (category.isSystemDefault) return; // Can't edit system defaults
    this.editingCategory.set(category);
    this.categoryForm.patchValue({
      name: category.name,
      icon: category.icon || '',
      color: category.color || '#4A90A4',
      displayOrder: category.displayOrder
    });
    this.showCategoryForm.set(true);
  }

  closeCategoryForm(): void {
    this.showCategoryForm.set(false);
    this.editingCategory.set(null);
  }

  saveCategory(): void {
    if (this.categoryForm.invalid || this.isCategorySubmitting()) return;

    this.isCategorySubmitting.set(true);
    const formValue = this.categoryForm.value;

    const request: ExpenseCategoryRequest = {
      name: formValue.name,
      icon: formValue.icon || undefined,
      color: formValue.color || undefined,
      displayOrder: formValue.displayOrder
    };

    const editing = this.editingCategory();
    const operation = editing
      ? this.expenseService.updateCategory(editing.id, request)
      : this.expenseService.createCategory(request);

    operation.subscribe({
      next: () => {
        this.loadData();
        this.closeCategoryForm();
        this.isCategorySubmitting.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to save category');
        this.isCategorySubmitting.set(false);
      }
    });
  }

  deleteCategory(category: ExpenseCategoryResponse): void {
    if (category.isSystemDefault) return;
    if (!confirm(`Are you sure you want to delete category "${category.name}"? Expenses in this category will become uncategorised.`)) {
      return;
    }

    this.expenseService.deleteCategory(category.id).subscribe({
      next: () => this.loadData(),
      error: () => this.error.set('Failed to delete category')
    });
  }

  formatFrequency(freq: string): string {
    const map: Record<string, string> = {
      'weekly': '/wk',
      'fortnightly': '/fn',
      'monthly': '/mo',
      'quarterly': '/qtr',
      'annually': '/yr',
      'one_off': ''
    };
    return map[freq] || '';
  }
}
