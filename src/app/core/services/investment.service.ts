import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { InvestmentHoldingRequest, InvestmentHoldingResponse, StockQuote, SecuritySearchResult } from '../../shared/models/investment.model';

@Injectable({
  providedIn: 'root'
})
export class InvestmentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/investments`;

  getAll(): Observable<InvestmentHoldingResponse[]> {
    return this.http.get<InvestmentHoldingResponse[]>(this.apiUrl);
  }

  getById(id: string): Observable<InvestmentHoldingResponse> {
    return this.http.get<InvestmentHoldingResponse>(`${this.apiUrl}/${id}`);
  }

  create(request: InvestmentHoldingRequest): Observable<InvestmentHoldingResponse> {
    return this.http.post<InvestmentHoldingResponse>(this.apiUrl, request);
  }

  update(id: string, request: InvestmentHoldingRequest): Observable<InvestmentHoldingResponse> {
    return this.http.put<InvestmentHoldingResponse>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Fetch stock quote from EODHD.
   * For Australian stocks on ASX, append .AU to the ticker (e.g., VAS.AU).
   */
  getQuote(ticker: string): Observable<StockQuote> {
    return this.http.get<StockQuote>(`${this.apiUrl}/quote/${ticker}`);
  }

  /**
   * Search for ASX securities by ticker or name.
   */
  searchSecurities(query: string, limit: number = 10): Observable<SecuritySearchResult[]> {
    return this.http.get<SecuritySearchResult[]>(`${environment.apiBaseUrl}/securities/search`, {
      params: { q: query, limit: limit.toString() }
    });
  }
}
