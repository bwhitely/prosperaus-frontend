import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IncomeSourceRequest, IncomeSourceResponse } from '../../shared/models/cash-flow.model';

@Injectable({
  providedIn: 'root'
})
export class IncomeService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/income`;

  getAll(): Observable<IncomeSourceResponse[]> {
    return this.http.get<IncomeSourceResponse[]>(this.apiUrl);
  }

  getActive(): Observable<IncomeSourceResponse[]> {
    return this.http.get<IncomeSourceResponse[]>(`${this.apiUrl}/active`);
  }

  getById(id: string): Observable<IncomeSourceResponse> {
    return this.http.get<IncomeSourceResponse>(`${this.apiUrl}/${id}`);
  }

  create(request: IncomeSourceRequest): Observable<IncomeSourceResponse> {
    return this.http.post<IncomeSourceResponse>(this.apiUrl, request);
  }

  update(id: string, request: IncomeSourceRequest): Observable<IncomeSourceResponse> {
    return this.http.put<IncomeSourceResponse>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
