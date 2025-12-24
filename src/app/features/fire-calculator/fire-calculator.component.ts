import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-fire-calculator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fire-calculator.component.html',
  styleUrl: './fire-calculator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FireCalculatorComponent {}
