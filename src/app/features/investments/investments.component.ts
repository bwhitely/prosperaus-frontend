import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, PercentPipe, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, filter, switchMap } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InvestmentService } from '../../core/services/investment.service';
import { PortfolioService } from '../../core/services/portfolio.service';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { InvestmentHoldingRequest, InvestmentHoldingResponse, StockQuote, SecuritySearchResult, PortfolioAnalysisResponse, CountryAllocation, GicsSectorAllocation, AssetTypeAllocation } from '../../shared/models/investment.model';
import { TickerAutocompleteComponent } from '../../shared/components/ticker-autocomplete/ticker-autocomplete.component';

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
  selector: 'app-investments',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    CurrencyPipe,
    DatePipe,
    PercentPipe,
    DecimalPipe,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatTooltipModule,
    TickerAutocompleteComponent
  ],
  templateUrl: './investments.component.html',
  styleUrl: './investments.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvestmentsComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private investmentService = inject(InvestmentService);
  private portfolioService = inject(PortfolioService);
  private confirmDialog = inject(ConfirmDialogService);
  private destroy$ = new Subject<void>();

  holdings = signal<InvestmentHoldingResponse[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  showForm = signal(false);
  editingHolding = signal<InvestmentHoldingResponse | null>(null);
  isSubmitting = signal(false);

  // Quote fetching
  isFetchingQuote = signal(false);
  quoteError = signal<string | null>(null);
  lastQuote = signal<StockQuote | null>(null);

  // Advanced options toggle
  showAdvancedOptions = signal(false);

  // Price refresh
  isRefreshingPrices = signal(false);
  refreshProgress = signal({ current: 0, total: 0 });

  // Portfolio analysis
  analysis = signal<PortfolioAnalysisResponse | null>(null);
  isLoadingAnalysis = signal(false);

  // Pie chart colors
  private readonly pieColors = [
    '#7c3aed', '#3b82f6', '#14b8a6', '#f59e0b', '#ec4899',
    '#06b6d4', '#10b981', '#6366f1', '#f97316', '#8b5cf6',
    '#ef4444', '#84cc16',
  ];

  private readonly gicsSectorColors: Record<string, string> = {
    '10': '#f97316', '15': '#84cc16', '20': '#6366f1', '25': '#ec4899',
    '30': '#f59e0b', '35': '#ef4444', '40': '#3b82f6', '45': '#7c3aed',
    '50': '#14b8a6', '55': '#78716c', '60': '#06b6d4',
  };

  private readonly assetTypeColors: Record<string, string> = {
    'EQUITIES': '#7c3aed', 'BONDS': '#3b82f6', 'CASH': '#10b981',
    'GOLD': '#f59e0b', 'PROPERTY': '#06b6d4',
  };

  // Computed values for allocations
  countryEntries = computed(() => this.analysis()?.countryAllocation ?? []);
  gicsSectorEntries = computed(() => this.analysis()?.gicsSectorAllocation ?? []);
  assetTypeEntries = computed(() => this.analysis()?.assetTypeAllocation ?? []);

  countryPieSlices = computed(() => this.createPieSlicesFromCountry(this.countryEntries()));
  gicsSectorPieSlices = computed(() => this.createPieSlicesFromGicsNormalized(this.gicsSectorEntries()));
  assetTypePieSlices = computed(() => this.createPieSlicesFromAssetType(this.assetTypeEntries()));

  hasGicsSectors = computed(() => this.gicsSectorEntries().length > 0);
  hasAssetTypes = computed(() => this.assetTypeEntries().length > 0);

  form: FormGroup = this.fb.group({
    ticker: ['', [Validators.required, Validators.maxLength(10)]],
    securityName: [''],
    securityType: ['etf'],
    units: [null, [Validators.required, Validators.min(0.0001)]],
    costBase: [null, [Validators.required, Validators.min(0)]],
    acquisitionDate: [''],
    currentPrice: [null],
    merPercent: [null, [Validators.min(0)]]
  });

  securityTypes = [
    { value: 'etf', label: 'ETF' },
    { value: 'stock', label: 'Stock' },
    { value: 'lic', label: 'LIC' },
    { value: 'reit', label: 'REIT' },
    { value: 'bond', label: 'Bond' },
    { value: 'crypto', label: 'Cryptocurrency' },
    { value: 'other', label: 'Other' }
  ];


  ngOnInit(): void {
    this.loadHoldings();
    this.setupTickerWatcher();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupTickerWatcher(): void {
    // Watch for ticker changes and fetch quote
    this.form.get('ticker')?.valueChanges.pipe(
      debounceTime(600),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(ticker => {
      if (ticker && ticker.length >= 2 && !this.editingHolding()) {
        this.fetchQuote(ticker);
      }
    });
  }

  fetchQuote(ticker: string): void {
    if (!ticker) return;

    this.isFetchingQuote.set(true);
    this.quoteError.set(null);

    // Normalize ticker for API call
    const tickerToFetch = ticker.toUpperCase();

    this.investmentService.getQuote(tickerToFetch).subscribe({
      next: (quote) => {
        this.lastQuote.set(quote);
        this.isFetchingQuote.set(false);

        // Auto-fill form fields from quote
        if (!this.form.get('currentPrice')?.value && quote.price) {
          this.form.patchValue({ currentPrice: quote.price });
        }

        // Auto-fill security name if available
        if (!this.form.get('securityName')?.value && quote.name) {
          this.form.patchValue({ securityName: quote.name });
        }

        // Auto-fill security type based on quoteType
        if (quote.quoteType) {
          const typeMap: Record<string, string> = {
            'ETF': 'etf',
            'EQUITY': 'stock',
            'MUTUALFUND': 'etf'
          };
          const mappedType = typeMap[quote.quoteType.toUpperCase()] || 'other';
          this.form.patchValue({ securityType: mappedType });
        }

        // Auto-fill MER
        const merControl = this.form.get('merPercent');
        if ((merControl?.value === null || merControl?.value === undefined || merControl?.value === '') && quote.mer != null) {
          merControl?.patchValue(quote.mer * 100); // quote.mer is stored as fraction (e.g. 0.0007), UI is percent (0.07)
        }
      },
      error: () => {
        this.quoteError.set('Could not fetch price. You can enter it manually.');
        this.isFetchingQuote.set(false);
        this.lastQuote.set(null);
      }
    });
  }

  /**
   * Format MER for display (e.g., 0.0007 -> "0.07%")
   */
  formatMer(mer: number | undefined): string {
    if (mer === undefined || mer === null) return '-';
    return (mer * 100).toFixed(2) + '%';
  }

  /**
   * Format yield for display (e.g., 0.035 -> "3.50%")
   */
  formatYield(yieldValue: number | undefined): string {
    if (yieldValue === undefined || yieldValue === null) return '-';
    return (yieldValue * 100).toFixed(2) + '%';
  }

  loadHoldings(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.investmentService.getAll().subscribe({
      next: (holdings) => {
        this.holdings.set(holdings);
        this.isLoading.set(false);
        this.loadAnalysis();
      },
      error: () => {
        this.error.set('Failed to load investments');
        this.isLoading.set(false);
      }
    });
  }

  loadAnalysis(): void {
    if (this.holdings().length === 0) {
      this.analysis.set(null);
      return;
    }
    this.isLoadingAnalysis.set(true);

    this.portfolioService.analyseUserPortfolio().subscribe({
      next: (analysis) => {
        this.analysis.set(analysis);
        this.isLoadingAnalysis.set(false);
      },
      error: () => {
        // Analysis errors shouldn't block CRUD operations
        this.isLoadingAnalysis.set(false);
      }
    });
  }

  getTotalValue(): number {
    return this.holdings().reduce((sum, h) => sum + (h.currentValue || 0), 0);
  }

  getTotalCostBase(): number {
    return this.holdings().reduce((sum, h) => sum + h.costBase, 0);
  }

  getTotalGainLoss(): number {
    return this.holdings().reduce((sum, h) => sum + (h.unrealisedGainLoss || 0), 0);
  }

  getTotalGainLossPercent(): number {
    const costBase = this.getTotalCostBase();
    if (costBase === 0) return 0;
    return (this.getTotalGainLoss() / costBase) * 100;
  }

  openAddForm(): void {
    this.editingHolding.set(null);
    this.form.reset({ securityType: 'etf', merPercent: null });
    this.lastQuote.set(null);
    this.quoteError.set(null);
    this.showForm.set(true);
  }

  openEditForm(holding: InvestmentHoldingResponse): void {
    this.editingHolding.set(holding);
    this.form.patchValue({
      ticker: holding.ticker,
      securityName: holding.securityName || '',
      securityType: holding.securityType,
      units: holding.units,
      costBase: holding.costBase,
      acquisitionDate: holding.acquisitionDate || '',
      currentPrice: holding.currentPrice,
      merPercent: holding.mer != null ? holding.mer * 100 : null
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingHolding.set(null);
    this.lastQuote.set(null);
    this.quoteError.set(null);
  }

  onSecuritySelected(security: SecuritySearchResult): void {
    // Auto-fill fields from selected security
    this.form.patchValue({
      ticker: security.ticker,
      securityName: security.name,
      securityType: security.type.toLowerCase()
    });

    // Fetch quote for the selected security
    this.fetchQuote(security.ticker);
  }

  toggleAdvancedOptions(): void {
    this.showAdvancedOptions.update(v => !v);
  }

  save(): void {
    if (this.form.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const formValue = this.form.value;

    const merPercent = formValue.merPercent;
    const merFraction =
      merPercent === null || merPercent === undefined || merPercent === ''
        ? undefined
        : Number(merPercent) / 100;

    const request: InvestmentHoldingRequest = {
      ticker: formValue.ticker.toUpperCase(),
      securityName: formValue.securityName || undefined,
      securityType: formValue.securityType,
      units: formValue.units,
      costBase: formValue.costBase,
      acquisitionDate: formValue.acquisitionDate || undefined,
      currentPrice: formValue.currentPrice || undefined,
      mer: merFraction
    };

    const editing = this.editingHolding();
    const operation = editing
      ? this.investmentService.update(editing.id, request)
      : this.investmentService.create(request);

    operation.subscribe({
      next: () => {
        this.loadHoldings();
        this.closeForm();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to save investment');
        this.isSubmitting.set(false);
      }
    });
  }

  delete(holding: InvestmentHoldingResponse): void {
    this.confirmDialog.confirmDelete(holding.ticker)
      .pipe(
        filter(confirmed => confirmed),
        switchMap(() => this.investmentService.delete(holding.id))
      )
      .subscribe({
        next: () => this.loadHoldings(),
        error: () => this.error.set('Failed to delete investment')
      });
  }

  getGainLossClass(value: number): string {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return '';
  }

  /**
   * Refresh prices and ETF metadata for all holdings from Yahoo Finance.
   * Uses the backend API which fetches quotes, MER, yield, sector and country allocations.
   */
  refreshAllPrices(): void {
    const holdingsList = this.holdings();
    if (holdingsList.length === 0 || this.isRefreshingPrices()) return;

    this.isRefreshingPrices.set(true);
    this.refreshProgress.set({ current: 0, total: holdingsList.length });
    this.error.set(null);

    this.investmentService.refreshAllPrices().subscribe({
      next: (result) => {
        this.refreshProgress.set({ current: result.holdingsRefreshed, total: holdingsList.length });
        this.loadHoldings();
        this.isRefreshingPrices.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to refresh prices');
        this.isRefreshingPrices.set(false);
      }
    });
  }

  /**
   * Format the price update timestamp for display.
   */
  formatPriceDate(dateString: string | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  }

  getSeverityClass(severity: string): string {
    return `severity--${severity}`;
  }

  // Pie chart methods
  private createPieSlicesFromCountry(entries: CountryAllocation[]): PieSlice[] {
    if (entries.length === 0) return [];

    const slices: PieSlice[] = [];
    const centerX = 100, centerY = 100, radius = 80;
    let currentAngle = -90;

    entries.forEach((entry, index) => {
      const sliceAngle = (entry.percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;

      const path = this.createArcPath(centerX, centerY, radius, startAngle, endAngle);
      const midAngle = startAngle + sliceAngle / 2;
      const labelRadius = radius * 0.65;
      const labelX = centerX + labelRadius * Math.cos((midAngle * Math.PI) / 180);
      const labelY = centerY + labelRadius * Math.sin((midAngle * Math.PI) / 180);

      slices.push({
        key: entry.code, label: entry.name, percentage: entry.percentage, value: entry.value,
        color: this.pieColors[index % this.pieColors.length], path, labelX, labelY,
      });
      currentAngle = endAngle;
    });
    return slices;
  }

  private createPieSlicesFromGicsNormalized(entries: GicsSectorAllocation[]): PieSlice[] {
    if (entries.length === 0) return [];

    const totalPercentage = entries.reduce((sum, e) => sum + e.percentage, 0);
    if (totalPercentage === 0) return [];

    const slices: PieSlice[] = [];
    const centerX = 100, centerY = 100, radius = 80;
    let currentAngle = -90;

    entries.forEach((entry, index) => {
      const normalizedPercentage = (entry.percentage / totalPercentage) * 100;
      const sliceAngle = (normalizedPercentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;

      const path = this.createArcPath(centerX, centerY, radius, startAngle, endAngle);
      const midAngle = startAngle + sliceAngle / 2;
      const labelRadius = radius * 0.65;
      const labelX = centerX + labelRadius * Math.cos((midAngle * Math.PI) / 180);
      const labelY = centerY + labelRadius * Math.sin((midAngle * Math.PI) / 180);

      slices.push({
        key: entry.code, label: entry.name, percentage: normalizedPercentage, value: entry.value,
        color: this.gicsSectorColors[entry.code] ?? this.pieColors[index % this.pieColors.length], path, labelX, labelY,
      });
      currentAngle = endAngle;
    });
    return slices;
  }

  private createPieSlicesFromAssetType(entries: AssetTypeAllocation[]): PieSlice[] {
    if (entries.length === 0) return [];

    const slices: PieSlice[] = [];
    const centerX = 100, centerY = 100, radius = 80;
    let currentAngle = -90;

    entries.forEach((entry, index) => {
      const sliceAngle = (entry.percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;

      const path = this.createArcPath(centerX, centerY, radius, startAngle, endAngle);
      const midAngle = startAngle + sliceAngle / 2;
      const labelRadius = radius * 0.65;
      const labelX = centerX + labelRadius * Math.cos((midAngle * Math.PI) / 180);
      const labelY = centerY + labelRadius * Math.sin((midAngle * Math.PI) / 180);

      slices.push({
        key: entry.type, label: entry.displayName, percentage: entry.percentage, value: entry.value,
        color: this.assetTypeColors[entry.type] ?? this.pieColors[index % this.pieColors.length], path, labelX, labelY,
      });
      currentAngle = endAngle;
    });
    return slices;
  }

  private createArcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
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
}
