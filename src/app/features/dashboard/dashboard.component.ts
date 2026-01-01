import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NetWorthService } from '../../core/services/net-worth.service';
import { PropertyService } from '../../core/services/property.service';
import { SuperAccountService } from '../../core/services/super-account.service';
import { InvestmentService } from '../../core/services/investment.service';
import { CashLiabilityService } from '../../core/services/cash-liability.service';
import { NetWorthResponse, NetWorthHistoryResponse } from '../../shared/models/net-worth.model';
import { PropertyResponse } from '../../shared/models/property.model';
import { SuperAccountResponse } from '../../shared/models/super-account.model';
import { InvestmentHoldingResponse } from '../../shared/models/investment.model';
import { CashAccountResponse } from '../../shared/models/cash-liability.model';

// Register Chart.js components
Chart.register(...registerables);

type AssetCategory = 'property' | 'super' | 'investments' | 'cash';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CurrencyPipe,
    DecimalPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private netWorthService = inject(NetWorthService);
  private propertyService = inject(PropertyService);
  private superAccountService = inject(SuperAccountService);
  private investmentService = inject(InvestmentService);
  private cashLiabilityService = inject(CashLiabilityService);

  @ViewChild('netWorthChart') chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;

  netWorth = signal<NetWorthResponse | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // History chart state
  historyData = signal<NetWorthHistoryResponse | null>(null);
  isHistoryLoading = signal(false);

  // Expandable category state
  expandedCategories = signal<Set<AssetCategory>>(new Set());
  categoryLoading = signal<Set<AssetCategory>>(new Set());

  // Individual asset data
  properties = signal<PropertyResponse[]>([]);
  superAccounts = signal<SuperAccountResponse[]>([]);
  investments = signal<InvestmentHoldingResponse[]>([]);
  cashAccounts = signal<CashAccountResponse[]>([]);

  ngOnInit(): void {
    this.loadNetWorth();
  }

  ngAfterViewInit(): void {
    this.loadNetWorthHistory();
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  loadNetWorth(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.netWorthService.getNetWorth().subscribe({
      next: (data) => {
        this.netWorth.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load net worth:', err);
        this.error.set('Failed to load financial data');
        this.isLoading.set(false);
      }
    });
  }

  hasAssets(): boolean {
    const data = this.netWorth();
    return data !== null && data.totalAssets > 0;
  }

  // Toggle category expansion
  toggleCategory(category: AssetCategory): void {
    const expanded = this.expandedCategories();
    const newSet = new Set(expanded);

    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
      // Fetch data if not already loaded
      this.fetchCategoryData(category);
    }

    this.expandedCategories.set(newSet);
  }

  isExpanded(category: AssetCategory): boolean {
    return this.expandedCategories().has(category);
  }

  isCategoryLoading(category: AssetCategory): boolean {
    return this.categoryLoading().has(category);
  }

  private fetchCategoryData(category: AssetCategory): void {
    // Check if already loaded
    switch (category) {
      case 'property':
        if (this.properties().length > 0) return;
        break;
      case 'super':
        if (this.superAccounts().length > 0) return;
        break;
      case 'investments':
        if (this.investments().length > 0) return;
        break;
      case 'cash':
        if (this.cashAccounts().length > 0) return;
        break;
    }

    // Set loading state
    const loading = new Set(this.categoryLoading());
    loading.add(category);
    this.categoryLoading.set(loading);

    // Fetch data based on category
    switch (category) {
      case 'property':
        this.propertyService.getProperties().subscribe({
          next: (data) => {
            this.properties.set(data);
            this.clearCategoryLoading(category);
          },
          error: () => this.clearCategoryLoading(category)
        });
        break;

      case 'super':
        this.superAccountService.getAll().subscribe({
          next: (data) => {
            this.superAccounts.set(data);
            this.clearCategoryLoading(category);
          },
          error: () => this.clearCategoryLoading(category)
        });
        break;

      case 'investments':
        this.investmentService.getAll().subscribe({
          next: (data) => {
            this.investments.set(data);
            this.clearCategoryLoading(category);
          },
          error: () => this.clearCategoryLoading(category)
        });
        break;

      case 'cash':
        this.cashLiabilityService.getCashAccounts().subscribe({
          next: (data) => {
            this.cashAccounts.set(data);
            this.clearCategoryLoading(category);
          },
          error: () => this.clearCategoryLoading(category)
        });
        break;
    }
  }

  private clearCategoryLoading(category: AssetCategory): void {
    const loading = new Set(this.categoryLoading());
    loading.delete(category);
    this.categoryLoading.set(loading);
  }

  loadNetWorthHistory(): void {
    this.isHistoryLoading.set(true);

    this.netWorthService.getNetWorthHistory().subscribe({
      next: (data) => {
        this.historyData.set(data);
        this.isHistoryLoading.set(false);
        // Render chart after data loads
        setTimeout(() => this.renderChart(), 0);
      },
      error: (err) => {
        console.error('Failed to load net worth history:', err);
        this.isHistoryLoading.set(false);
      }
    });
  }

  private renderChart(): void {
    const history = this.historyData();
    if (!history || history.dataPoints.length === 0 || !this.chartCanvas) {
      return;
    }

    // Destroy existing chart if any
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = history.dataPoints.map(d => this.formatChartDate(d.date));
    const netWorthData = history.dataPoints.map(d => d.netWorth);
    const assetsData = history.dataPoints.map(d => d.totalAssets);
    const liabilitiesData = history.dataPoints.map(d => d.totalLiabilities);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Net Worth',
            data: netWorthData,
            borderColor: '#1a365d',
            backgroundColor: 'rgba(26, 54, 93, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 5
          },
          {
            label: 'Assets',
            data: assetsData,
            borderColor: '#38a169',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            tension: 0.3,
            pointRadius: 2,
            pointHoverRadius: 4
          },
          {
            label: 'Liabilities',
            data: liabilitiesData,
            borderColor: '#e53e3e',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            tension: 0.3,
            pointRadius: 2,
            pointHoverRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 15
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y ?? 0;
                return `${context.dataset.label}: ${this.formatCurrency(value)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: false,
            ticks: {
              callback: (value) => this.formatCurrency(Number(value))
            }
          }
        }
      }
    });
  }

  private formatChartDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' });
  }

  private formatCurrency(value: number): string {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value.toFixed(0)}`;
  }

  hasHistoryData(): boolean {
    const data = this.historyData();
    return data !== null && data.dataPoints.length > 0;
  }
}
