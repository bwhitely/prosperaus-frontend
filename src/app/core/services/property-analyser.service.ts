import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PropertyAnalysisRequest, PropertyAnalysisResponse } from '../../shared/models/property-analysis.model';

/**
 * Service for investment property analysis.
 */
@Injectable({ providedIn: 'root' })
export class PropertyAnalyserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/v1/property`;

  /**
   * Analyse an investment property.
   */
  analyse(request: PropertyAnalysisRequest): Observable<PropertyAnalysisResponse> {
    return this.http.post<PropertyAnalysisResponse>(`${this.apiUrl}/analyse`, request);
  }
}
