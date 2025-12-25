import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export type TaxResidency = 'RESIDENT' | 'NON_RESIDENT' | 'WORKING_HOLIDAY';

export interface UserProfile {
  id: string;
  displayName: string | null;
  email: string;
  taxResidency: TaxResidency;
  marginalTaxRate: number | null;
  hasPrivateHealthInsurance: boolean;
  dateOfBirth: string | null;
  retirementAge: number;
  preferredCurrency: string;
  onboardingCompleted: boolean;
}

export interface ProfileUpdateRequest {
  displayName?: string;
  taxResidency?: TaxResidency;
  marginalTaxRate?: number;
  hasPrivateHealthInsurance?: boolean;
  dateOfBirth?: string;
  retirementAge?: number;
  preferredCurrency?: string;
}

export interface OnboardingRequest {
  displayName: string;
  taxResidency: TaxResidency;
  dateOfBirth: string;
  marginalTaxRate?: number;
  hasPrivateHealthInsurance?: boolean;
  retirementAge?: number;
}

export interface OnboardingStatus {
  completed: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/profile`;

  private profileState = signal<UserProfile | null>(null);
  private loadingState = signal(false);

  profile = this.profileState.asReadonly();
  isLoading = this.loadingState.asReadonly();

  hasCompletedOnboarding = computed(() => this.profileState()?.onboardingCompleted ?? false);

  getProfile(): Observable<UserProfile> {
    this.loadingState.set(true);
    return this.http.get<UserProfile>(this.apiUrl).pipe(
      tap({
        next: (profile) => {
          this.profileState.set(profile);
          this.loadingState.set(false);
        },
        error: () => this.loadingState.set(false)
      })
    );
  }

  updateProfile(request: ProfileUpdateRequest): Observable<UserProfile> {
    this.loadingState.set(true);
    return this.http.put<UserProfile>(this.apiUrl, request).pipe(
      tap({
        next: (profile) => {
          this.profileState.set(profile);
          this.loadingState.set(false);
        },
        error: () => this.loadingState.set(false)
      })
    );
  }

  completeOnboarding(request: OnboardingRequest): Observable<UserProfile> {
    this.loadingState.set(true);
    return this.http.post<UserProfile>(`${this.apiUrl}/onboarding`, request).pipe(
      tap({
        next: (profile) => {
          this.profileState.set(profile);
          this.loadingState.set(false);
        },
        error: () => this.loadingState.set(false)
      })
    );
  }

  getOnboardingStatus(): Observable<OnboardingStatus> {
    return this.http.get<OnboardingStatus>(`${this.apiUrl}/onboarding/status`);
  }

  clearProfile(): void {
    this.profileState.set(null);
  }
}
