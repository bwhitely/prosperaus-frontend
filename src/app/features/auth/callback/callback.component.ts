import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SupabaseService } from '../../../core/auth/supabase.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div class="callback-container">
      <mat-spinner diameter="48"></mat-spinner>
      <p>Completing sign in...</p>
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      gap: 16px;

      p {
        color: #4a5568;
        font-size: 14px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CallbackComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  async ngOnInit(): Promise<void> {
    // Supabase client automatically handles the OAuth callback
    // when detectSessionInUrl is true (which we have set)
    // We just need to wait for the session and redirect

    const session = await this.supabase.getSession();

    if (session) {
      // Successfully authenticated, redirect to dashboard
      this.router.navigate(['/dashboard']);
    } else {
      // No session - something went wrong, redirect to login
      this.router.navigate(['/auth/login'], {
        queryParams: { error: 'oauth_failed' }
      });
    }
  }
}
