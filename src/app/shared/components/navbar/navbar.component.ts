import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../core/auth/auth.service';
import { SubscriptionService } from '../../../core/services/subscription.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent {
  private authService = inject(AuthService);
  private subscriptionService = inject(SubscriptionService);
  private router = inject(Router);

  isMobileMenuOpen = signal(false);

  isAuthenticated = this.authService.isAuthenticated;
  user = this.authService.user;
  isPro = this.subscriptionService.isPro;

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(open => !open);
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
    this.isMobileMenuOpen.set(false);
  }
}
