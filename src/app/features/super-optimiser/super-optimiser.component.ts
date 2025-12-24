import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-super-optimiser',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './super-optimiser.component.html',
  styleUrl: './super-optimiser.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuperOptimiserComponent {}
