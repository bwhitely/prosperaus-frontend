import { Component, ChangeDetectionStrategy, inject, signal, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IncomeService } from '../../../../core/services/income.service';
import { IncomeSourceRequest, IncomeSourceResponse, IncomeFrequency } from '../../../../shared/models/cash-flow.model';

@Component({
  selector: 'app-income-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './income-list.component.html',
  styleUrl: './income-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IncomeListComponent implements OnInit {
  @Output() changed = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private incomeService = inject(IncomeService);

  incomeSources = signal<IncomeSourceResponse[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  showModal = signal(false);
  editingSource = signal<IncomeSourceResponse | null>(null);
  isSubmitting = signal(false);

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    sourceType: ['salary', Validators.required],
    grossAmount: [null, [Validators.required, Validators.min(0.01)]],
    frequency: ['monthly', Validators.required],
    taxWithheld: [0],
    isActive: [true],
    startDate: [''],
    endDate: [''],
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

  getTotalMonthly(): number {
    return this.incomeSources()
      .filter(s => s.isActive)
      .reduce((sum, s) => sum + s.monthlyAmount, 0);
  }

  openAddModal(): void {
    this.editingSource.set(null);
    this.form.reset({
      sourceType: 'salary',
      frequency: 'monthly',
      taxWithheld: 0,
      isActive: true
    });
    this.showModal.set(true);
  }

  openEditModal(source: IncomeSourceResponse): void {
    this.editingSource.set(source);
    this.form.patchValue({
      name: source.name,
      sourceType: source.sourceType,
      grossAmount: source.grossAmount,
      frequency: source.frequency,
      taxWithheld: source.taxWithheld || 0,
      isActive: source.isActive,
      startDate: source.startDate || '',
      endDate: source.endDate || '',
      notes: source.notes || ''
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
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
      taxWithheld: formValue.taxWithheld || undefined,
      isActive: formValue.isActive,
      startDate: formValue.startDate || undefined,
      endDate: formValue.endDate || undefined,
      notes: formValue.notes || undefined
    };

    const editing = this.editingSource();
    const operation = editing
      ? this.incomeService.update(editing.id, request)
      : this.incomeService.create(request);

    operation.subscribe({
      next: () => {
        this.loadIncomeSources();
        this.closeModal();
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
    if (!confirm(`Are you sure you want to delete "${source.name}"?`)) {
      return;
    }

    this.incomeService.delete(source.id).subscribe({
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
