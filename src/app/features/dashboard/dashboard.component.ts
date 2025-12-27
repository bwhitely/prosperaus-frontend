import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NetWorthService } from '../../core/services/net-worth.service';
import { NetWorthResponse } from '../../shared/models/net-worth.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, DecimalPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private netWorthService = inject(NetWorthService);

  netWorth = signal<NetWorthResponse | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadNetWorth();
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
}
