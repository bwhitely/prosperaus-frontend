import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent {
  private authService = inject(AuthService);

  isMobileMenuOpen = signal(false);
  isToolsDropdownOpen = signal(false);
  isUserDropdownOpen = signal(false);

  isAuthenticated = this.authService.isAuthenticated;
  user = this.authService.user;

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(open => !open);
  }

  toggleToolsDropdown(): void {
    this.isToolsDropdownOpen.update(open => !open);
  }

  toggleUserDropdown(): void {
    this.isUserDropdownOpen.update(open => !open);
  }

  closeDropdowns(): void {
    this.isToolsDropdownOpen.set(false);
    this.isUserDropdownOpen.set(false);
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
    this.isMobileMenuOpen.set(false);
  }
}
