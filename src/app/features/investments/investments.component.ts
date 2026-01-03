import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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
import { InvestmentHoldingRequest, InvestmentHoldingResponse, StockQuote, SecuritySearchResult } from '../../shared/models/investment.model';
import { TickerAutocompleteComponent } from '../../shared/components/ticker-autocomplete/ticker-autocomplete.component';

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

  form: FormGroup = this.fb.group({
    ticker: ['', [Validators.required, Validators.maxLength(10)]],
    securityName: [''],
    securityType: ['etf'],
    units: [null, [Validators.required, Validators.min(0.0001)]],
    costBase: [null, [Validators.required, Validators.min(0)]],
    acquisitionDate: [''],
    currentPrice: [null]
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

    // For Australian stocks, try with .AU suffix if no suffix present
    const normalizedTicker = ticker.toUpperCase();
    const tickerToFetch = ticker.toUpperCase();

    this.investmentService.getQuote(tickerToFetch).subscribe({
      next: (quote) => {
        this.lastQuote.set(quote);
        this.isFetchingQuote.set(false);

        // Auto-fill the current price if not already set
        if (!this.form.get('currentPrice')?.value && quote.price) {
          this.form.patchValue({ currentPrice: quote.price });
        }
      },
      error: () => {
        // Try without suffix for US stocks
        if (tickerToFetch.endsWith('.AU')) {
          this.investmentService.getQuote(normalizedTicker).subscribe({
            next: (quote) => {
              this.lastQuote.set(quote);
              this.isFetchingQuote.set(false);
              if (!this.form.get('currentPrice')?.value && quote.price) {
                this.form.patchValue({ currentPrice: quote.price });
              }
            },
            error: () => {
              this.quoteError.set('Could not fetch price. You can enter it manually.');
              this.isFetchingQuote.set(false);
              this.lastQuote.set(null);
            }
          });
        } else {
          this.quoteError.set('Could not fetch price. You can enter it manually.');
          this.isFetchingQuote.set(false);
          this.lastQuote.set(null);
        }
      }
    });
  }

  loadHoldings(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.investmentService.getAll().subscribe({
      next: (holdings) => {
        this.holdings.set(holdings);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load investments');
        this.isLoading.set(false);
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
    this.form.reset({ securityType: 'etf' });
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
      currentPrice: holding.currentPrice
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

    const request: InvestmentHoldingRequest = {
      ticker: formValue.ticker.toUpperCase(),
      securityName: formValue.securityName || undefined,
      securityType: formValue.securityType,
      units: formValue.units,
      costBase: formValue.costBase,
      acquisitionDate: formValue.acquisitionDate || undefined,
      currentPrice: formValue.currentPrice || undefined
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
    if (!confirm(`Are you sure you want to delete ${holding.ticker}?`)) {
      return;
    }

    this.investmentService.delete(holding.id).subscribe({
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
   * Refresh prices for all holdings from EODHD API.
   * Fetches quotes in parallel and updates each holding.
   */
  refreshAllPrices(): void {
    const holdingsList = this.holdings();
    if (holdingsList.length === 0 || this.isRefreshingPrices()) return;

    this.isRefreshingPrices.set(true);
    this.refreshProgress.set({ current: 0, total: holdingsList.length });
    this.error.set(null);

    // Create an array of quote fetch observables
    const quoteRequests = holdingsList.map(holding =>
      this.investmentService.getQuote(holding.ticker).pipe(
        map(quote => ({ holding, quote, success: true as const })),
        catchError(() => of({ holding, quote: null, success: false as const }))
      )
    );

    // Execute all in parallel
    forkJoin(quoteRequests).subscribe({
      next: (results) => {
        let updatedCount = 0;
        let current = 0;

        // Update each holding that got a successful quote
        const updateRequests = results
          .filter(r => r.success && r.quote)
          .map(r => {
            const request: InvestmentHoldingRequest = {
              ticker: r.holding.ticker,
              securityName: r.holding.securityName,
              securityType: r.holding.securityType,
              units: r.holding.units,
              costBase: r.holding.costBase,
              acquisitionDate: r.holding.acquisitionDate,
              currentPrice: r.quote!.price
            };
            return this.investmentService.update(r.holding.id, request).pipe(
              map(() => {
                current++;
                this.refreshProgress.set({ current, total: holdingsList.length });
                return true;
              }),
              catchError(() => of(false))
            );
          });

        if (updateRequests.length === 0) {
          this.isRefreshingPrices.set(false);
          this.error.set('Could not fetch prices for any holdings');
          return;
        }

        forkJoin(updateRequests).subscribe({
          next: (updateResults) => {
            updatedCount = updateResults.filter(Boolean).length;
            this.loadHoldings();
            this.isRefreshingPrices.set(false);
          },
          error: () => {
            this.error.set('Failed to update some prices');
            this.isRefreshingPrices.set(false);
            this.loadHoldings();
          }
        });
      },
      error: () => {
        this.error.set('Failed to refresh prices');
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
}
