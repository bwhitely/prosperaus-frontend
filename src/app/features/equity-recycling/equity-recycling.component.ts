import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-equity-recycling',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './equity-recycling.component.html',
  styleUrl: './equity-recycling.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EquityRecyclingComponent {}
