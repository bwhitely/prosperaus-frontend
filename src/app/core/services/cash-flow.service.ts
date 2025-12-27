import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CashFlowSummaryResponse } from '../../shared/models/cash-flow.model';

@Injectable({
  providedIn: 'root'
})
export class CashFlowService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/cash-flow`;

  getSummary(): Observable<CashFlowSummaryResponse> {
    return this.http.get<CashFlowSummaryResponse>(`${this.apiUrl}/summary`);
  }
}
