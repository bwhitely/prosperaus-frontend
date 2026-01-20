import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingComponent {
  currentYear = new Date().getFullYear();

  features = [
    {
      icon: 'chart-line',
      title: 'Net Worth Tracking',
      description: 'Track all your assets and liabilities in one place. Watch your wealth grow over time with beautiful visualisations.'
    },
    {
      icon: 'recycle',
      title: 'Equity Recycling',
      description: 'Unlock the power of debt recycling. Model the tax benefits of converting non-deductible debt into deductible investment loans.'
    },
    {
      icon: 'fire',
      title: 'FIRE Calculator',
      description: 'Plan your path to Financial Independence. Model retirement scenarios with Australian-specific super access ages and tax rules.'
    },
    {
      icon: 'building',
      title: 'Property Analysis',
      description: 'Analyze investment properties with accurate negative gearing calculations, rental yields, and capital growth projections.'
    },
    {
      icon: 'piggy-bank',
      title: 'Super Optimisation',
      description: 'Maximise your superannuation with salary sacrifice modelling, carry-forward contributions, and Division 293 analysis.'
    },
    {
      icon: 'briefcase',
      title: 'Portfolio Management',
      description: 'Track your ETF and share portfolio with franking credit calculations, CGT tracking, and sector allocation analysis.'
    }
  ];

  testimonials = [
    {
      quote: "Finally, a platform that understands Australian tax rules. The equity recycling calculator alone saved me thousands in tax.",
      author: "Michael T.",
      role: "Property Investor, Sydney"
    },
    {
      quote: "The FIRE calculator helped me realise I could retire 5 years earlier than I thought by optimising my super contributions.",
      author: "Sarah L.",
      role: "Software Engineer, Melbourne"
    },
    {
      quote: "Clean interface, accurate calculations, and it just works. This is what I've been looking for.",
      author: "David K.",
      role: "Financial Analyst, Brisbane"
    }
  ];
}
