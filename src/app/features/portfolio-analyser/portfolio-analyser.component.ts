import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe, PercentPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PortfolioService } from '../../core/services/portfolio.service';
import { PortfolioAnalysisResponse, CountryAllocation, GicsSectorAllocation, AssetTypeAllocation, AllocationBreakdown } from '../../shared/models/investment.model';

interface PieSlice {
  key: string;
  label: string;
  percentage: number;
  value: number;
  color: string;
  path: string;
  labelX: number;
  labelY: number;
}

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

  // Pie chart colors - matching our purple/blue theme
  private readonly pieColors = [
    '#7c3aed', // Purple (primary)
    '#3b82f6', // Blue (secondary)
    '#14b8a6', // Teal (accent)
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#10b981', // Green
    '#6366f1', // Indigo
    '#f97316', // Orange
    '#8b5cf6', // Light purple
    '#ef4444', // Red
    '#84cc16', // Lime
  ];

  // GICS sector colors - more distinct for the 11 sectors
  private readonly gicsSectorColors: Record<string, string> = {
    '10': '#f97316', // Energy - Orange
    '15': '#84cc16', // Materials - Lime
    '20': '#6366f1', // Industrials - Indigo
    '25': '#ec4899', // Consumer Discretionary - Pink
    '30': '#f59e0b', // Consumer Staples - Amber
    '35': '#ef4444', // Health Care - Red
    '40': '#3b82f6', // Financials - Blue
    '45': '#7c3aed', // Information Technology - Purple
    '50': '#14b8a6', // Communication Services - Teal
    '55': '#78716c', // Utilities - Stone
    '60': '#06b6d4', // Real Estate - Cyan
  };

  // Asset type colors
  private readonly assetTypeColors: Record<string, string> = {
    'EQUITIES': '#7c3aed', // Purple
    'BONDS': '#3b82f6',    // Blue
    'CASH': '#10b981',     // Green
    'GOLD': '#f59e0b',     // Amber
    'PROPERTY': '#06b6d4', // Cyan
  };

  // Computed values for allocations (using new structures)
  countryEntries = computed(() => {
    const a = this.analysis();
    return a?.countryAllocation ?? [];
  });

  gicsSectorEntries = computed(() => {
    const a = this.analysis();
    return a?.gicsSectorAllocation ?? [];
  });

  assetTypeEntries = computed(() => {
    const a = this.analysis();
    return a?.assetTypeAllocation ?? [];
  });

  categoryEntries = computed(() => {
    const a = this.analysis();
    if (!a) return [];
    return this.sortAllocation(a.categoryAllocation);
  });

  // Pie chart data
  countryPieSlices = computed(() => {
    const entries = this.countryEntries();
    return this.createPieSlicesFromCountry(entries);
  });

  gicsSectorPieSlices = computed(() => {
    const entries = this.gicsSectorEntries();
    return this.createPieSlicesFromGics(entries);
  });

  assetTypePieSlices = computed(() => {
    const entries = this.assetTypeEntries();
    return this.createPieSlicesFromAssetType(entries);
  });

  hasHoldings = computed(() => {
    const a = this.analysis();
    return a && a.holdings.length > 0;
  });

  hasGicsSectors = computed(() => {
    const entries = this.gicsSectorEntries();
    return entries.length > 0;
  });

  hasAssetTypes = computed(() => {
    const entries = this.assetTypeEntries();
    return entries.length > 0;
  });

  private createPieSlicesFromCountry(entries: CountryAllocation[]): PieSlice[] {
    if (entries.length === 0) return [];

    const slices: PieSlice[] = [];
    const centerX = 100;
    const centerY = 100;
    const radius = 80;
    let currentAngle = -90; // Start from top

    entries.forEach((entry, index) => {
      const percentage = entry.percentage;
      const sliceAngle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;

      const path = this.createArcPath(centerX, centerY, radius, startAngle, endAngle);
      const midAngle = startAngle + sliceAngle / 2;
      const labelRadius = radius * 0.65;
      const labelX = centerX + labelRadius * Math.cos((midAngle * Math.PI) / 180);
      const labelY = centerY + labelRadius * Math.sin((midAngle * Math.PI) / 180);

      slices.push({
        key: entry.code,
        label: entry.name,
        percentage,
        value: entry.value,
        color: this.pieColors[index % this.pieColors.length],
        path,
        labelX,
        labelY,
      });

      currentAngle = endAngle;
    });

    return slices;
  }

  private createPieSlicesFromGics(entries: GicsSectorAllocation[]): PieSlice[] {
    if (entries.length === 0) return [];

    const slices: PieSlice[] = [];
    const centerX = 100;
    const centerY = 100;
    const radius = 80;
    let currentAngle = -90;

    entries.forEach((entry, index) => {
      const percentage = entry.percentage;
      const sliceAngle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;

      const path = this.createArcPath(centerX, centerY, radius, startAngle, endAngle);
      const midAngle = startAngle + sliceAngle / 2;
      const labelRadius = radius * 0.65;
      const labelX = centerX + labelRadius * Math.cos((midAngle * Math.PI) / 180);
      const labelY = centerY + labelRadius * Math.sin((midAngle * Math.PI) / 180);

      slices.push({
        key: entry.code,
        label: entry.name,
        percentage,
        value: entry.value,
        color: this.gicsSectorColors[entry.code] ?? this.pieColors[index % this.pieColors.length],
        path,
        labelX,
        labelY,
      });

      currentAngle = endAngle;
    });

    return slices;
  }

  private createPieSlicesFromAssetType(entries: AssetTypeAllocation[]): PieSlice[] {
    if (entries.length === 0) return [];

    const slices: PieSlice[] = [];
    const centerX = 100;
    const centerY = 100;
    const radius = 80;
    let currentAngle = -90;

    entries.forEach((entry, index) => {
      const percentage = entry.percentage;
      const sliceAngle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;

      const path = this.createArcPath(centerX, centerY, radius, startAngle, endAngle);
      const midAngle = startAngle + sliceAngle / 2;
      const labelRadius = radius * 0.65;
      const labelX = centerX + labelRadius * Math.cos((midAngle * Math.PI) / 180);
      const labelY = centerY + labelRadius * Math.sin((midAngle * Math.PI) / 180);

      slices.push({
        key: entry.type,
        label: entry.displayName,
        percentage,
        value: entry.value,
        color: this.assetTypeColors[entry.type] ?? this.pieColors[index % this.pieColors.length],
        path,
        labelX,
        labelY,
      });

      currentAngle = endAngle;
    });

    return slices;
  }

  private createArcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
    // Handle full circle case
    if (endAngle - startAngle >= 359.99) {
      return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`;
    }

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  }

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
    return this.pieColors[index % this.pieColors.length];
  }

  getGicsSectorColor(code: string, index: number): string {
    return this.gicsSectorColors[code] ?? this.pieColors[index % this.pieColors.length];
  }
}
