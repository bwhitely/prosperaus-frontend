import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { InvestmentHoldingRequest, InvestmentHoldingResponse, StockQuote, SecuritySearchResult } from '../../shared/models/investment.model';

export interface RefreshResult {
  status: string;
  message: string;
  holdingsRefreshed: number;
}

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
   * Fetch stock/ETF quote from Yahoo Finance.
   * For Australian stocks on ASX, append .AX (e.g., VAS.AX) or .AU (will be converted).
   * Returns price, MER, yield, sector weightings, and top holdings for ETFs.
   */
  getQuote(ticker: string): Observable<StockQuote> {
    return this.http.get<StockQuote>(`${this.apiUrl}/quote/${ticker}`);
  }

  /**
   * Refresh prices and ETF metadata for all user's holdings from Yahoo Finance.
   * This fetches latest prices, MER, yield, sector allocations, and country allocations.
   */
  refreshAllPrices(): Observable<RefreshResult> {
    return this.http.post<RefreshResult>(`${this.apiUrl}/refresh`, {});
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
