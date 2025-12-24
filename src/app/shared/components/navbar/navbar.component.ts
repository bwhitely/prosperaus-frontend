import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent {
  isMobileMenuOpen = signal(false);
  isToolsDropdownOpen = signal(false);

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(open => !open);
  }

  toggleToolsDropdown(): void {
    this.isToolsDropdownOpen.update(open => !open);
  }

  closeDropdowns(): void {
    this.isToolsDropdownOpen.set(false);
  }
}
