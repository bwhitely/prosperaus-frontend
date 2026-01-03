import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MortgageCalculatorRequest, MortgageCalculatorResponse } from '../../shared/models/mortgage-calculator.model';

export interface MortgageCalculatorPrefillData {
  loanAmount?: number;
  interestRate?: number;
  loanTermYears?: number;
  offsetStartBalance?: number;
  repaymentFrequency?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MortgageCalculatorService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/mortgage-calculator`;

  calculate(request: MortgageCalculatorRequest): Observable<MortgageCalculatorResponse> {
    return this.http.post<MortgageCalculatorResponse>(`${this.apiUrl}/calculate`, request);
  }

  getPrefillData(): Observable<MortgageCalculatorPrefillData> {
    return this.http.get<MortgageCalculatorPrefillData>(`${this.apiUrl}/prefill`);
  }
}
