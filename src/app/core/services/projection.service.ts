import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  NetWorthProjectionRequest,
  NetWorthProjectionResponse
} from '../../shared/models/projection.model';
import { ScenarioResponse } from '../../shared/models/scenario.model';

export interface ProjectionPrefillData {
  personal?: {
    currentAge?: number;
    targetRetirementAge?: number;
  };
  superannuation?: {
    currentBalance?: number;
    salarySacrifice?: number;
  };
  incomeSources?: Array<{
    name?: string;
    sourceType?: string;
    amount?: number;
    frequency?: string;
  }>;
  ppor?: {
    currentValue?: number;
    mortgageBalance?: number;
    interestRate?: number;
    offsetBalance?: number;
    remainingTermYears?: number;
  };
  investmentProperties?: Array<{
    name?: string;
    currentValue?: number;
    mortgageBalance?: number;
    interestRate?: number;
    weeklyRent?: number;
    annualExpenses?: number;
  }>;
  shares?: {
    currentValue?: number;
  };
  cash?: {
    currentBalance?: number;
  };
  expenses?: {
    annualAmount?: number;
  };
  tax?: {
    marginalTaxRate?: number;
    includeFrankingCredits?: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ProjectionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/projections`;

  /**
   * Calculate net worth projection without saving.
   * Use this for real-time updates as user adjusts inputs.
   */
  calculate(request: NetWorthProjectionRequest): Observable<NetWorthProjectionResponse> {
    return this.http.post<NetWorthProjectionResponse>(`${this.apiUrl}/calculate`, request);
  }

  /**
   * Calculate and save projection as a scenario.
   */
  calculateAndSave(request: NetWorthProjectionRequest, name: string = 'Net Worth Projection'): Observable<NetWorthProjectionResponse> {
    const params = new HttpParams().set('name', name);
    return this.http.post<NetWorthProjectionResponse>(
      `${this.apiUrl}/calculate-and-save`,
      request,
      { params }
    );
  }

  /**
   * Get saved projection scenarios for the current user.
   */
  getScenarios(): Observable<ScenarioResponse[]> {
    return this.http.get<ScenarioResponse[]>(`${this.apiUrl}/scenarios`);
  }

  /**
   * Get prefill data from user's profile, assets, income, and expenses.
   */
  getPrefillData(): Observable<ProjectionPrefillData> {
    return this.http.get<ProjectionPrefillData>(`${this.apiUrl}/prefill`);
  }
}
