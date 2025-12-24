import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-property-analyser',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './property-analyser.component.html',
  styleUrl: './property-analyser.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PropertyAnalyserComponent {}
