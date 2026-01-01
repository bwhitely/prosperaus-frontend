import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NetWorthResponse, NetWorthHistoryResponse } from '../../shared/models/net-worth.model';

@Injectable({
  providedIn: 'root'
})
export class NetWorthService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiBaseUrl;

  getNetWorth(): Observable<NetWorthResponse> {
    return this.http.get<NetWorthResponse>(`${this.apiUrl}/net-worth`);
  }

  getNetWorthHistory(from?: string, to?: string): Observable<NetWorthHistoryResponse> {
    let params = new HttpParams();
    if (from) {
      params = params.set('from', from);
    }
    if (to) {
      params = params.set('to', to);
    }
    return this.http.get<NetWorthHistoryResponse>(`${this.apiUrl}/net-worth/history`, { params });
  }

  createSnapshot(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/net-worth/snapshot`, {});
  }
}
