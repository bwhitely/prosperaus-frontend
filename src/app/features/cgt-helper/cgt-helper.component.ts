import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe, PercentPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CgtService } from '../../core/services/cgt.service';
import {
  CgtSummaryResponse,
  CgtOptimisationResponse,
  CgtHoldingResponse,
  HoldingCgtSummary
} from '../../shared/models/cgt.model';

@Component({
  selector: 'app-cgt-helper',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, DecimalPipe, PercentPipe],
  templateUrl: './cgt-helper.component.html',
  styleUrl: './cgt-helper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CgtHelperComponent implements OnInit {
  private cgtService = inject(CgtService);

  summary = signal<CgtSummaryResponse | null>(null);
  optimisation = signal<CgtOptimisationResponse | null>(null);
  selectedHolding = signal<CgtHoldingResponse | null>(null);

  isLoading = signal(true);
  error = signal<string | null>(null);

  activeTab = signal<'summary' | 'optimise' | 'holding'>('summary');

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    // Load summary
    this.cgtService.getCgtSummary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load CGT summary:', err);
        this.error.set('Failed to load CGT data');
        this.isLoading.set(false);
      }
    });

    // Load optimisation suggestions
    this.cgtService.getOptimisationSuggestions().subscribe({
      next: (data) => this.optimisation.set(data),
      error: (err) => console.error('Failed to load optimisation suggestions:', err)
    });
  }

  setTab(tab: 'summary' | 'optimise' | 'holding'): void {
    this.activeTab.set(tab);
  }

  selectHolding(holding: HoldingCgtSummary): void {
    this.cgtService.getCgtForHolding(holding.holdingId).subscribe({
      next: (data) => {
        this.selectedHolding.set(data);
        this.activeTab.set('holding');
      },
      error: (err) => {
        console.error('Failed to load holding CGT:', err);
        this.error.set('Failed to load holding details');
      }
    });
  }

  backToSummary(): void {
    this.selectedHolding.set(null);
    this.activeTab.set('summary');
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  }

  formatPercent(value: number): string {
    return (value * 100).toFixed(1) + '%';
  }
}
