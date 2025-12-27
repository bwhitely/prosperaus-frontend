import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BankStatementUploadRequest,
  BankStatementUploadResponse,
  BankTransactionCategoriseRequest,
  BankTransactionResponse,
  StatementAnalysisResponse,
  CategorySuggestion
} from '../../shared/models/cash-flow.model';

@Injectable({
  providedIn: 'root'
})
export class BankStatementService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/statements`;

  getUploads(): Observable<BankStatementUploadResponse[]> {
    return this.http.get<BankStatementUploadResponse[]>(this.apiUrl);
  }

  getUploadById(id: string): Observable<BankStatementUploadResponse> {
    return this.http.get<BankStatementUploadResponse>(`${this.apiUrl}/${id}`);
  }

  uploadStatement(file: File, request?: BankStatementUploadRequest): Observable<BankStatementUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    if (request?.accountName) {
      formData.append('accountName', request.accountName);
    }
    if (request?.institution) {
      formData.append('institution', request.institution);
    }
    if (request?.periodStart) {
      formData.append('periodStart', request.periodStart);
    }
    if (request?.periodEnd) {
      formData.append('periodEnd', request.periodEnd);
    }

    return this.http.post<BankStatementUploadResponse>(`${this.apiUrl}/upload`, formData);
  }

  deleteUpload(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getTransactions(uploadId: string): Observable<BankTransactionResponse[]> {
    return this.http.get<BankTransactionResponse[]>(`${this.apiUrl}/${uploadId}/transactions`);
  }

  getUncategorisedTransactions(): Observable<BankTransactionResponse[]> {
    return this.http.get<BankTransactionResponse[]>(`${this.apiUrl}/transactions/uncategorised`);
  }

  categoriseTransaction(transactionId: string, request: BankTransactionCategoriseRequest): Observable<BankTransactionResponse> {
    return this.http.put<BankTransactionResponse>(
      `${this.apiUrl}/transactions/${transactionId}/categorise`,
      request
    );
  }

  /**
   * Analyse transactions from a specific upload using AI.
   */
  analyseStatement(uploadId: string): Observable<StatementAnalysisResponse> {
    return this.http.post<StatementAnalysisResponse>(`${this.apiUrl}/${uploadId}/analyse`, {});
  }

  /**
   * Analyse all uploaded statements for the user.
   */
  analyseAllStatements(): Observable<StatementAnalysisResponse> {
    return this.http.post<StatementAnalysisResponse>(`${this.apiUrl}/analyse-all`, {});
  }

  /**
   * Apply AI-suggested categories to transactions.
   */
  applySuggestions(uploadId: string, suggestions: CategorySuggestion[]): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${uploadId}/apply-suggestions`, suggestions);
  }
}
