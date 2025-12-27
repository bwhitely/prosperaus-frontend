import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, PercentPipe } from '@angular/common';
import { CashFlowService } from '../../core/services/cash-flow.service';
import { CashFlowSummaryResponse } from '../../shared/models/cash-flow.model';
import { IncomeListComponent } from './components/income-list/income-list.component';
import { ExpenseListComponent } from './components/expense-list/expense-list.component';
import { StatementUploadComponent } from './components/statement-upload/statement-upload.component';

type TabType = 'income' | 'expenses' | 'statements';

@Component({
  selector: 'app-cash-flow',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    PercentPipe,
    IncomeListComponent,
    ExpenseListComponent,
    StatementUploadComponent
  ],
  templateUrl: './cash-flow.component.html',
  styleUrl: './cash-flow.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CashFlowComponent implements OnInit {
  private cashFlowService = inject(CashFlowService);

  summary = signal<CashFlowSummaryResponse | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  activeTab = signal<TabType>('income');

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.cashFlowService.getSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load cash flow summary');
        this.isLoading.set(false);
      }
    });
  }

  setTab(tab: TabType): void {
    this.activeTab.set(tab);
  }

  getSavingsRateClass(): string {
    const rate = this.summary()?.savingsRate ?? 0;
    if (rate >= 0.3) return 'positive';
    if (rate >= 0.1) return 'neutral';
    return 'negative';
  }
}
