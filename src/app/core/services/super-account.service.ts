import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SuperAccountRequest, SuperAccountResponse } from '../../shared/models/super-account.model';

@Injectable({
  providedIn: 'root'
})
export class SuperAccountService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/super-accounts`;

  getAll(): Observable<SuperAccountResponse[]> {
    return this.http.get<SuperAccountResponse[]>(this.apiUrl);
  }

  getById(id: string): Observable<SuperAccountResponse> {
    return this.http.get<SuperAccountResponse>(`${this.apiUrl}/${id}`);
  }

  create(request: SuperAccountRequest): Observable<SuperAccountResponse> {
    return this.http.post<SuperAccountResponse>(this.apiUrl, request);
  }

  update(id: string, request: SuperAccountRequest): Observable<SuperAccountResponse> {
    return this.http.put<SuperAccountResponse>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
