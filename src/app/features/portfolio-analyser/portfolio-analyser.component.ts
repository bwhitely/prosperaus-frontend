import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe, PercentPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PortfolioService } from '../../core/services/portfolio.service';
import { PortfolioAnalysisResponse, AllocationBreakdown, OverlapWarning, HoldingAnalysis } from '../../shared/models/investment.model';

@Component({
  selector: 'app-portfolio-analyser',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, DecimalPipe, PercentPipe],
  templateUrl: './portfolio-analyser.component.html',
  styleUrl: './portfolio-analyser.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortfolioAnalyserComponent implements OnInit {
  private portfolioService = inject(PortfolioService);

  analysis = signal<PortfolioAnalysisResponse | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Computed values for allocations
  geographyEntries = computed(() => {
    const a = this.analysis();
    if (!a) return [];
    return this.sortAllocation(a.geographyAllocation);
  });

  assetClassEntries = computed(() => {
    const a = this.analysis();
    if (!a) return [];
    return this.sortAllocation(a.assetClassAllocation);
  });

  categoryEntries = computed(() => {
    const a = this.analysis();
    if (!a) return [];
    return this.sortAllocation(a.categoryAllocation);
  });

  hasHoldings = computed(() => {
    const a = this.analysis();
    return a && a.holdings.length > 0;
  });

  ngOnInit(): void {
    this.loadAnalysis();
  }

  loadAnalysis(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.portfolioService.analyseUserPortfolio().subscribe({
      next: (analysis) => {
        this.analysis.set(analysis);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load portfolio analysis');
        this.isLoading.set(false);
        console.error('Portfolio analysis error:', err);
      }
    });
  }

  private sortAllocation(allocation: Record<string, AllocationBreakdown>): Array<{key: string, value: AllocationBreakdown}> {
    return Object.entries(allocation)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value.percentage - a.value.percentage);
  }

  getGeographyLabel(key: string): string {
    const labels: Record<string, string> = {
      'australia': 'Australia',
      'us': 'United States',
      'global': 'Global',
      'global_developed': 'Developed Markets',
      'global_ex_us': 'Global ex-US',
      'asia_ex_japan': 'Asia ex-Japan',
      'emerging': 'Emerging Markets',
      'Unknown': 'Other'
    };
    return labels[key] || key;
  }

  getAssetClassLabel(key: string): string {
    const labels: Record<string, string> = {
      'equity': 'Equities',
      'fixed_income': 'Fixed Income',
      'property': 'Property',
      'cash': 'Cash',
      'Unknown': 'Other'
    };
    return labels[key] || key;
  }

  getCategoryLabel(key: string): string {
    return key || 'Other';
  }

  getSeverityClass(severity: string): string {
    return `severity--${severity}`;
  }

  formatMer(mer: number | null): string {
    if (mer === null) return '-';
    return (mer * 100).toFixed(2) + '%';
  }

  getGainLossClass(value: number | null): string {
    if (value === null) return '';
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return '';
  }

  getAllocationColor(index: number): string {
    const colors = [
      '#1a365d', // Primary
      '#38a169', // Accent
      '#3182ce', // Blue
      '#805ad5', // Purple
      '#dd6b20', // Orange
      '#319795', // Teal
      '#d53f8c', // Pink
      '#718096', // Gray
    ];
    return colors[index % colors.length];
  }
}
