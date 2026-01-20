import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PropertyAnalysisRequest, PropertyAnalysisResponse } from '../../shared/models/property-analysis.model';

export interface PropertyAnalyserPrefillData {
  purchasePrice?: number;
  depositAmount?: number;
  interestRate?: number;
  loanTermYears?: number;
  weeklyRent?: number;
  otherExpenses?: number;
  marginalTaxRate?: number;
  isInterestOnly?: boolean;
}

/**
 * Service for investment property analysis.
 */
@Injectable({ providedIn: 'root' })
export class PropertyAnalyserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/property`;

  /**
   * Analyze an investment property.
   */
  analyse(request: PropertyAnalysisRequest): Observable<PropertyAnalysisResponse> {
    return this.http.post<PropertyAnalysisResponse>(`${this.apiUrl}/analyse`, request);
  }

  /**
   * Get prefill data from user's existing properties.
   */
  getPrefillData(): Observable<PropertyAnalyserPrefillData> {
    return this.http.get<PropertyAnalyserPrefillData>(`${this.apiUrl}/prefill`);
  }
}
