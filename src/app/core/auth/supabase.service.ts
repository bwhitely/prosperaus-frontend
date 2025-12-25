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

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return this.supabase.auth.onAuthStateChange(callback);
  }
}
