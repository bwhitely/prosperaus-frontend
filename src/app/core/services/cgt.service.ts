import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CgtHoldingResponse,
  CgtSummaryResponse,
  CgtOptimisationResponse,
  ParcelRequest,
  ParcelResponse
} from '../../shared/models/cgt.model';

@Injectable({
  providedIn: 'root'
})
export class CgtService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/cgt`;

  /**
   * Get CGT breakdown for a specific holding.
   */
  getCgtForHolding(holdingId: string): Observable<CgtHoldingResponse> {
    return this.http.get<CgtHoldingResponse>(`${this.baseUrl}/holdings/${holdingId}`);
  }

  /**
   * Get overall CGT summary for user.
   */
  getCgtSummary(): Observable<CgtSummaryResponse> {
    return this.http.get<CgtSummaryResponse>(`${this.baseUrl}/summary`);
  }

  /**
   * Get CGT summary for a specific financial year.
   */
  getCgtSummaryForYear(financialYear: string): Observable<CgtSummaryResponse> {
    return this.http.get<CgtSummaryResponse>(`${this.baseUrl}/summary/${financialYear}`);
  }

  /**
   * Get CGT optimisation suggestions.
   */
  getOptimisationSuggestions(): Observable<CgtOptimisationResponse> {
    return this.http.get<CgtOptimisationResponse>(`${this.baseUrl}/optimise`);
  }

  /**
   * Get parcels for a holding.
   */
  getParcelsForHolding(holdingId: string): Observable<ParcelResponse[]> {
    return this.http.get<ParcelResponse[]>(`${this.baseUrl}/holdings/${holdingId}/parcels`);
  }

  /**
   * Add a parcel to a holding.
   */
  addParcel(holdingId: string, request: ParcelRequest): Observable<ParcelResponse> {
    return this.http.post<ParcelResponse>(`${this.baseUrl}/holdings/${holdingId}/parcels`, request);
  }

  /**
   * Update a parcel.
   */
  updateParcel(parcelId: string, request: ParcelRequest): Observable<ParcelResponse> {
    return this.http.put<ParcelResponse>(`${this.baseUrl}/parcels/${parcelId}`, request);
  }

  /**
   * Delete a parcel.
   */
  deleteParcel(parcelId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/parcels/${parcelId}`);
  }
}
