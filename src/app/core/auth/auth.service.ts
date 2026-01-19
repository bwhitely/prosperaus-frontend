import { Injectable, signal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import { User, Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSignal = signal<User | null>(null);
  private sessionSignal = signal<Session | null>(null);
  private isLoadingSignal = signal<boolean>(true);

  readonly user = this.userSignal.asReadonly();
  readonly session = this.sessionSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.sessionSignal());

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {
    this.initAuthListener();
  }

  private async initAuthListener(): Promise<void> {
    // Get initial session
    const session = await this.supabase.getSession();
    if (session) {
      this.sessionSignal.set(session);
      const user = await this.supabase.getUser();
      this.userSignal.set(user);
    }
    this.isLoadingSignal.set(false);

    // Listen for auth changes
    this.supabase.onAuthStateChange((event, session) => {
      this.sessionSignal.set(session);
      this.userSignal.set(session?.user ?? null);

      if (event === 'SIGNED_OUT') {
        this.router.navigate(['/auth/login']);
      } else if (event === 'SIGNED_IN' && session) {
        // Check if user needs onboarding
        this.checkOnboardingStatus();
      }
    });
  }

  private async checkOnboardingStatus(): Promise<void> {
    // TODO: Check if user has completed onboarding
    // For now, redirect to dashboard
    const currentUrl = this.router.url;
    if (currentUrl.startsWith('/auth/')) {
      this.router.navigate(['/dashboard']);
    }
  }

  async signUp(email: string, password: string): Promise<{ success: boolean; error: string | null }> {
    this.isLoadingSignal.set(true);
    try {
      const { user, error } = await this.supabase.signUp(email, password);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, error: null };
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  async signIn(email: string, password: string): Promise<{ success: boolean; error: string | null }> {
    this.isLoadingSignal.set(true);
    try {
      const { session, error } = await this.supabase.signIn(email, password);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, error: null };
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  async signOut(): Promise<void> {
    await this.supabase.signOut();
    this.router.navigate(['/auth/login']);
  }

  async resetPassword(email: string): Promise<{ success: boolean; error: string | null }> {
    const { error } = await this.supabase.resetPassword(email);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  }

  async updatePassword(newPassword: string): Promise<{ success: boolean; error: string | null }> {
    const { error } = await this.supabase.updatePassword(newPassword);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  }

  async signInWithGoogle(): Promise<{ success: boolean; error: string | null }> {
    this.isLoadingSignal.set(true);
    try {
      const { error } = await this.supabase.signInWithGoogle();
      if (error) {
        return { success: false, error: error.message };
      }
      // OAuth redirect happens, so we won't reach here normally
      return { success: true, error: null };
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  getAccessToken(): string | null {
    return this.sessionSignal()?.access_token ?? null;
  }
}
