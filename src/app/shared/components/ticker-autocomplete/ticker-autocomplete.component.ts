import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  input,
  output,
  OnInit,
  OnDestroy,
  ElementRef,
  HostListener,
  forwardRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, filter, switchMap, catchError } from 'rxjs';
import { of } from 'rxjs';
import { InvestmentService } from '../../../core/services/investment.service';
import { SecuritySearchResult } from '../../models/investment.model';

@Component({
  selector: 'app-ticker-autocomplete',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ticker-autocomplete.component.html',
  styleUrl: './ticker-autocomplete.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TickerAutocompleteComponent),
      multi: true
    }
  ]
})
export class TickerAutocompleteComponent implements OnInit, OnDestroy, ControlValueAccessor {
  private investmentService = inject(InvestmentService);
  private elementRef = inject(ElementRef);
  private destroy$ = new Subject<void>();

  // Inputs
  placeholder = input<string>('Search ticker or company...');
  disabled = input<boolean>(false);

  // Outputs
  securitySelected = output<SecuritySearchResult>();

  // Internal state
  searchControl = new FormControl('');
  results = signal<SecuritySearchResult[]>([]);
  isLoading = signal(false);
  isOpen = signal(false);
  highlightedIndex = signal(-1);
  noResults = signal(false);

  // ControlValueAccessor
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnInit(): void {
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(query => !!query && query.length >= 1),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.search(query!);
    });

    // Clear results when input is empty
    this.searchControl.valueChanges.pipe(
      filter(query => !query || query.length === 0),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.results.set([]);
      this.isOpen.set(false);
      this.noResults.set(false);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private search(query: string): void {
    this.isLoading.set(true);
    this.noResults.set(false);

    this.investmentService.searchSecurities(query, 10).pipe(
      catchError(() => of([]))
    ).subscribe(results => {
      this.results.set(results);
      this.isOpen.set(true);
      this.isLoading.set(false);
      this.highlightedIndex.set(-1);
      this.noResults.set(results.length === 0 && query.length > 0);
    });
  }

  selectResult(result: SecuritySearchResult): void {
    this.searchControl.setValue(result.ticker, { emitEvent: false });
    this.onChange(result.ticker);
    this.securitySelected.emit(result);
    this.isOpen.set(false);
    this.results.set([]);
  }

  onInputFocus(): void {
    if (this.results().length > 0) {
      this.isOpen.set(true);
    }
  }

  onInputBlur(): void {
    this.onTouched();
    // Delay closing to allow click on results
    setTimeout(() => {
      this.isOpen.set(false);
    }, 200);
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const results = this.results();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.isOpen() && results.length > 0) {
          this.isOpen.set(true);
        }
        this.highlightedIndex.update(i => Math.min(i + 1, results.length - 1));
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.highlightedIndex.update(i => Math.max(i - 1, 0));
        break;

      case 'Enter':
        event.preventDefault();
        const idx = this.highlightedIndex();
        if (idx >= 0 && idx < results.length) {
          this.selectResult(results[idx]);
        }
        break;

      case 'Escape':
        this.isOpen.set(false);
        break;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'ETF': 'ETF',
      'Stock': 'Stock',
      'LIC': 'LIC',
      'REIT': 'REIT',
      'Bond': 'Bond'
    };
    return labels[type] || type;
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.searchControl.setValue(value || '', { emitEvent: false });
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.searchControl.disable();
    } else {
      this.searchControl.enable();
    }
  }

  // Manual value change (for when user types and tabs out without selecting)
  onManualInput(): void {
    const value = this.searchControl.value?.toUpperCase() || '';
    this.searchControl.setValue(value, { emitEvent: false });
    this.onChange(value);
  }
}
