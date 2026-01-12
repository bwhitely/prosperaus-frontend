import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  OnInit
} from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { TwoDecimalDirective } from '../../shared/directives/two-decimal.directive';
import { Chart, registerables } from 'chart.js';
import { MortgageCalculatorService } from '../../core/services/mortgage-calculator.service';
import {
  MortgageCalculatorRequest,
  MortgageCalculatorResponse,
  YearBreakdown
} from '../../shared/models/mortgage-calculator.model';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-mortgage-calculator',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CurrencyPipe,
    DecimalPipe,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatTabsModule,
    TwoDecimalDirective
  ],
  templateUrl: './mortgage-calculator.component.html',
  styleUrl: './mortgage-calculator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MortgageCalculatorComponent implements OnInit, AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private mortgageService = inject(MortgageCalculatorService);

  @ViewChild('mortgageChart') chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;

  result = signal<MortgageCalculatorResponse | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  repaymentFrequencies = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'fortnightly', label: 'Fortnightly' },
    { value: 'monthly', label: 'Monthly' }
  ];

  form: FormGroup = this.fb.group({
    // Loan Details
    loanAmount: [500000, [Validators.required, Validators.min(10000), Validators.max(10000000)]],
    interestRate: [6.5, [Validators.required, Validators.min(0.1), Validators.max(25)]],
    loanTermYears: [30, [Validators.required, Validators.min(1), Validators.max(40)]],
    repaymentFrequency: ['monthly', Validators.required],

    // Offset Account
    offsetStartBalance: [0, [Validators.min(0)]],
    offsetContribution: [0, [Validators.min(0)]],
    offsetContributionFrequency: ['fortnightly'],

    // Extra Repayments
    extraRepaymentAmount: [0, [Validators.min(0)]],
    extraRepaymentFrequency: ['monthly'],

    // Lump Sum
    lumpSumAmount: [0, [Validators.min(0)]],
    lumpSumMonth: [null, [Validators.min(1), Validators.max(480)]]
  });

  // Computed values
  hasOptimisations = computed(() => {
    const r = this.result();
    return r && r.monthsSaved > 0;
  });

  yearsAndMonthsSaved = computed(() => {
    const r = this.result();
    if (!r || r.monthsSaved <= 0) return null;
    const years = Math.floor(r.monthsSaved / 12);
    const months = r.monthsSaved % 12;
    if (years > 0 && months > 0) {
      return `${years} year${years > 1 ? 's' : ''} ${months} month${months > 1 ? 's' : ''}`;
    } else if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}`;
    }
    return `${months} month${months > 1 ? 's' : ''}`;
  });

  constructor() {
    // Auto-calculate on form changes
    this.form.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    ).subscribe(() => {
      if (this.form.valid) {
        this.calculate();
      }
    });

    // Initial calculation
    setTimeout(() => this.calculate(), 100);
  }

  ngOnInit(): void {
    this.loadPrefillData();
  }

  loadPrefillData(): void {
    this.mortgageService.getPrefillData().subscribe({
      next: (data) => {
        if (data && Object.keys(data).length > 0) {
          const patchData: Record<string, unknown> = {};

          if (data.loanAmount) {
            patchData['loanAmount'] = data.loanAmount;
          }
          if (data.interestRate) {
            // Backend returns decimal (0.065), form expects percentage (6.5)
            patchData['interestRate'] = data.interestRate * 100;
          }
          if (data.loanTermYears) {
            patchData['loanTermYears'] = data.loanTermYears;
          }
          if (data.offsetStartBalance !== undefined) {
            patchData['offsetStartBalance'] = data.offsetStartBalance;
          }
          if (data.repaymentFrequency) {
            patchData['repaymentFrequency'] = data.repaymentFrequency.toLowerCase();
          }

          if (Object.keys(patchData).length > 0) {
            this.form.patchValue(patchData);
          }
        }
      },
      error: () => {
        // Silently fail - form stays with defaults
      }
    });
  }

  ngAfterViewInit(): void {
    // Chart will be rendered after first calculation
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  calculate(): void {
    if (this.form.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    const formValue = this.form.value;
    const request: MortgageCalculatorRequest = {
      loanAmount: formValue.loanAmount,
      interestRate: formValue.interestRate / 100, // Convert % to decimal
      loanTermYears: formValue.loanTermYears,
      repaymentFrequency: formValue.repaymentFrequency,
      offsetStartBalance: formValue.offsetStartBalance || 0,
      offsetContribution: formValue.offsetContribution || 0,
      offsetContributionFrequency: formValue.offsetContributionFrequency,
      extraRepaymentAmount: formValue.extraRepaymentAmount || 0,
      extraRepaymentFrequency: formValue.extraRepaymentFrequency,
      lumpSumAmount: formValue.lumpSumAmount || 0,
      lumpSumMonth: formValue.lumpSumMonth || undefined
    };

    this.mortgageService.calculate(request).subscribe({
      next: (response) => {
        this.result.set(response);
        this.isLoading.set(false);
        setTimeout(() => this.renderChart(), 0);
      },
      error: (err) => {
        console.error('Calculation failed:', err);
        this.error.set(err.error?.message || 'Calculation failed. Please check your inputs.');
        this.isLoading.set(false);
      }
    });
  }

  private renderChart(): void {
    const result = this.result();
    if (!result || !result.yearlyBreakdown || result.yearlyBreakdown.length === 0) {
      return;
    }

    if (!this.chartCanvas) {
      return;
    }

    // Destroy existing chart
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const breakdown = result.yearlyBreakdown;
    const labels = breakdown.map(y => `Year ${y.year}`);
    const cumulativePrincipal = breakdown.map(y => y.cumulativePrincipal);
    const cumulativeInterest = breakdown.map(y => y.cumulativeInterest);
    const remainingBalance = breakdown.map(y => y.endingBalance);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Cumulative Principal',
            data: cumulativePrincipal,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 2,
            pointHoverRadius: 5
          },
          {
            label: 'Cumulative Interest',
            data: cumulativeInterest,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 2,
            pointHoverRadius: 5
          },
          {
            label: 'Remaining Balance',
            data: remainingBalance,
            borderColor: '#6366f1',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            tension: 0.3,
            pointRadius: 2,
            pointHoverRadius: 5
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
            beginAtZero: true,
            ticks: {
              callback: (value) => this.formatCurrency(Number(value))
            }
          }
        }
      }
    });
  }

  private formatCurrency(value: number): string {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value.toFixed(0)}`;
  }

  formatFrequency(frequency: string): string {
    return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  }

  getYearlyData(): YearBreakdown[] {
    const result = this.result();
    return result?.yearlyBreakdown || [];
  }


}
