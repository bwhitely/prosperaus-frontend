import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-statement-analyser',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './statement-analyser.component.html',
  styleUrl: './statement-analyser.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatementAnalyserComponent {}
