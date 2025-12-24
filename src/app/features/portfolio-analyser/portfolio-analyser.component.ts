import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-portfolio-analyser',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portfolio-analyser.component.html',
  styleUrl: './portfolio-analyser.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortfolioAnalyserComponent {}
