import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DistributionRequest,
  DistributionResponse,
  DistributionSummaryResponse,
  DividendProjectionResponse
} from '../../shared/models/distribution.model';

@Injectable({
  providedIn: 'root'
})
export class DistributionService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/distributions`;

  /**
   * Get all distributions for the user.
   */
  getDistributions(): Observable<DistributionResponse[]> {
    return this.http.get<DistributionResponse[]>(this.baseUrl);
  }

  /**
   * Get distributions for a specific holding.
   */
  getDistributionsForHolding(holdingId: string): Observable<DistributionResponse[]> {
    return this.http.get<DistributionResponse[]>(`${this.baseUrl}/holdings/${holdingId}`);
  }

  /**
   * Get a single distribution.
   */
  getDistribution(distributionId: string): Observable<DistributionResponse> {
    return this.http.get<DistributionResponse>(`${this.baseUrl}/${distributionId}`);
  }

  /**
   * Create a new distribution.
   */
  createDistribution(request: DistributionRequest): Observable<DistributionResponse> {
    return this.http.post<DistributionResponse>(this.baseUrl, request);
  }

  /**
   * Update a distribution.
   */
  updateDistribution(distributionId: string, request: DistributionRequest): Observable<DistributionResponse> {
    return this.http.put<DistributionResponse>(`${this.baseUrl}/${distributionId}`, request);
  }

  /**
   * Delete a distribution.
   */
  deleteDistribution(distributionId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${distributionId}`);
  }

  /**
   * Get distribution summary for current financial year.
   */
  getSummary(): Observable<DistributionSummaryResponse> {
    return this.http.get<DistributionSummaryResponse>(`${this.baseUrl}/summary`);
  }

  /**
   * Get distribution summary for a specific financial year.
   */
  getSummaryForYear(financialYear: string): Observable<DistributionSummaryResponse> {
    return this.http.get<DistributionSummaryResponse>(`${this.baseUrl}/summary/${financialYear}`);
  }

  /**
   * Get dividend projections based on current holdings and yield data.
   */
  getProjections(): Observable<DividendProjectionResponse> {
    return this.http.get<DividendProjectionResponse>(`${this.baseUrl}/projections`);
  }
}
