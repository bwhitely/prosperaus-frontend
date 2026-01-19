import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      }
    );
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  async signUp(email: string, password: string): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password
    });
    return {
      user: data.user,
      session: data.session,
      error: error as Error | null
    };
  }

  async signIn(email: string, password: string): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    return {
      user: data.user,
      session: data.session,
      error: error as Error | null
    };
  }

  async signOut(): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.auth.signOut();
    return { error: error as Error | null };
  }

  async getSession(): Promise<Session | null> {
    const { data } = await this.supabase.auth.getSession();

    if (!data.session) {
      return null;
    }

    // Check if token is expired or about to expire (within 60 seconds)
    const expiresAt = data.session.expires_at;
    if (expiresAt) {
      const now = Math.floor(Date.now() / 1000);
      const bufferSeconds = 60;

      if (expiresAt < now + bufferSeconds) {
        // Token expired or about to expire, refresh it
        const { data: refreshData, error } = await this.supabase.auth.refreshSession();
        if (error || !refreshData.session) {
          console.error('Failed to refresh session:', error);
          return null;
        }
        return refreshData.session;
      }
    }

    return data.session;
  }

  async getUser(): Promise<User | null> {
    const { data } = await this.supabase.auth.getUser();
    return data.user;
  }

  async resetPassword(email: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });
    return { error: error as Error | null };
  }

  async updatePassword(newPassword: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword
    });
    return { error: error as Error | null };
  }

  async signInWithGoogle(): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });
    return { error: error as Error | null };
  }

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return this.supabase.auth.onAuthStateChange(callback);
  }
}
