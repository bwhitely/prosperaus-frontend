import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EquityRecyclingRequest, EquityRecyclingResponse } from '../../shared/models/equity-recycling.model';

@Injectable({
  providedIn: 'root'
})
export class EquityRecyclingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/equity-recycling`;

  calculate(request: EquityRecyclingRequest): Observable<EquityRecyclingResponse> {
    return this.http.post<EquityRecyclingResponse>(`${this.apiUrl}/calculate`, request);
  }
}
