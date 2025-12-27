import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe, PercentPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DistributionService } from '../../core/services/distribution.service';
import { InvestmentService } from '../../core/services/investment.service';
import {
  DistributionResponse,
  DistributionSummaryResponse,
  DistributionRequest
} from '../../shared/models/distribution.model';
import { InvestmentHoldingResponse } from '../../shared/models/investment.model';

@Component({
  selector: 'app-dividends',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, DecimalPipe, PercentPipe, DatePipe],
  templateUrl: './dividends.component.html',
  styleUrl: './dividends.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DividendsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private distributionService = inject(DistributionService);
  private investmentService = inject(InvestmentService);

  distributions = signal<DistributionResponse[]>([]);
  summary = signal<DistributionSummaryResponse | null>(null);
  holdings = signal<InvestmentHoldingResponse[]>([]);

  isLoading = signal(true);
  error = signal<string | null>(null);

  showModal = signal(false);
  editing = signal<DistributionResponse | null>(null);
  isSubmitting = signal(false);

  activeTab = signal<'summary' | 'list'>('summary');
  selectedYear = signal<string | null>(null);

  distributionForm: FormGroup = this.fb.group({
    holdingId: ['', Validators.required],
    distributionType: ['dividend'],
    distributionDate: ['', Validators.required],
    paymentDate: [''],
    amountPerUnit: [null, [Validators.required, Validators.min(0)]],
    unitsHeld: [null, [Validators.required, Validators.min(0)]],
    frankingPercentage: [100, [Validators.min(0), Validators.max(100)]],
    isDrp: [false],
    drpUnits: [null],
    drpPrice: [null],
    notes: ['']
  });

  distributionTypes = [
    { value: 'dividend', label: 'Dividend' },
    { value: 'distribution', label: 'Distribution' },
    { value: 'drp', label: 'DRP' },
    { value: 'special', label: 'Special' }
  ];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    // Load holdings for the dropdown
    this.investmentService.getAll().subscribe({
      next: (holdings: InvestmentHoldingResponse[]) => this.holdings.set(holdings),
      error: (err: Error) => console.error('Failed to load holdings:', err)
    });

    // Load summary
    this.distributionService.getSummary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.selectedYear.set(data.financialYear);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load summary:', err);
        this.error.set('Failed to load dividend data');
        this.isLoading.set(false);
      }
    });

    // Load all distributions
    this.distributionService.getDistributions().subscribe({
      next: (data) => this.distributions.set(data),
      error: (err) => console.error('Failed to load distributions:', err)
    });
  }

  setTab(tab: 'summary' | 'list'): void {
    this.activeTab.set(tab);
  }

  selectYear(year: string): void {
    this.selectedYear.set(year);
    this.distributionService.getSummaryForYear(year).subscribe({
      next: (data) => this.summary.set(data),
      error: (err) => console.error('Failed to load year summary:', err)
    });
  }

  openAddModal(): void {
    this.editing.set(null);
    this.distributionForm.reset({
      distributionType: 'dividend',
      frankingPercentage: 100,
      isDrp: false
    });
    this.showModal.set(true);
  }

  openEditModal(distribution: DistributionResponse): void {
    this.editing.set(distribution);
    this.distributionForm.patchValue({
      holdingId: distribution.holdingId,
      distributionType: distribution.distributionType,
      distributionDate: distribution.distributionDate,
      paymentDate: distribution.paymentDate || '',
      amountPerUnit: distribution.amountPerUnit,
      unitsHeld: distribution.unitsHeld,
      frankingPercentage: distribution.frankingPercentage * 100,
      isDrp: distribution.isDrp,
      drpUnits: distribution.drpUnits,
      drpPrice: distribution.drpPrice,
      notes: distribution.notes || ''
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editing.set(null);
  }

  saveDistribution(): void {
    if (this.distributionForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const formValue = this.distributionForm.value;

    const request: DistributionRequest = {
      holdingId: formValue.holdingId,
      distributionType: formValue.distributionType,
      distributionDate: formValue.distributionDate,
      paymentDate: formValue.paymentDate || undefined,
      amountPerUnit: formValue.amountPerUnit,
      unitsHeld: formValue.unitsHeld,
      frankingPercentage: formValue.frankingPercentage / 100,
      isDrp: formValue.isDrp,
      drpUnits: formValue.drpUnits || undefined,
      drpPrice: formValue.drpPrice || undefined,
      notes: formValue.notes || undefined
    };

    const editing = this.editing();
    const operation = editing
      ? this.distributionService.updateDistribution(editing.id, request)
      : this.distributionService.createDistribution(request);

    operation.subscribe({
      next: () => {
        this.loadData();
        this.closeModal();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to save distribution');
        this.isSubmitting.set(false);
      }
    });
  }

  deleteDistribution(distribution: DistributionResponse): void {
    if (!confirm(`Delete ${distribution.ticker} distribution from ${distribution.distributionDate}?`)) return;

    this.distributionService.deleteDistribution(distribution.id).subscribe({
      next: () => this.loadData(),
      error: () => this.error.set('Failed to delete distribution')
    });
  }

  getDistributionTypeLabel(type: string): string {
    return this.distributionTypes.find(t => t.value === type)?.label || type;
  }

  getFilteredDistributions(): DistributionResponse[] {
    const year = this.selectedYear();
    if (!year) return this.distributions();
    return this.distributions().filter(d => d.financialYear === year);
  }
}
