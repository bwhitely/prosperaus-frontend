import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PortfolioAnalysisRequest,
  PortfolioAnalysisResponse,
  EtfMetadata
} from '../../shared/models/investment.model';

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/portfolio`;

  /**
   * Analyse a portfolio based on provided holdings.
   */
  analyse(request: PortfolioAnalysisRequest): Observable<PortfolioAnalysisResponse> {
    return this.http.post<PortfolioAnalysisResponse>(`${this.apiUrl}/analyse`, request);
  }

  /**
   * Analyse the current user's saved portfolio holdings.
   */
  analyseUserPortfolio(): Observable<PortfolioAnalysisResponse> {
    return this.http.get<PortfolioAnalysisResponse>(`${this.apiUrl}/analyse`);
  }

  /**
   * Get all available ETF metadata.
   */
  getAllEtfs(): Observable<EtfMetadata[]> {
    return this.http.get<EtfMetadata[]>(`${this.apiUrl}/etfs`);
  }

  /**
   * Get ETF metadata by ticker.
   */
  getEtfByTicker(ticker: string): Observable<EtfMetadata> {
    return this.http.get<EtfMetadata>(`${this.apiUrl}/etfs/${ticker}`);
  }
}
