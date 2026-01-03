import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EquityRecyclingRequest, EquityRecyclingResponse } from '../../shared/models/equity-recycling.model';

export interface EquityRecyclingPrefillData {
  propertyValue?: number;
  mortgageBalance?: number;
  interestRate?: number;
  offsetBalance?: number;
  redrawAvailable?: number;
  marginalTaxRate?: number;
}

@Injectable({
  providedIn: 'root'
})
export class EquityRecyclingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/equity-recycling`;

  calculate(request: EquityRecyclingRequest): Observable<EquityRecyclingResponse> {
    return this.http.post<EquityRecyclingResponse>(`${this.apiUrl}/calculate`, request);
  }

  getPrefillData(): Observable<EquityRecyclingPrefillData> {
    return this.http.get<EquityRecyclingPrefillData>(`${this.apiUrl}/prefill`);
  }
}
