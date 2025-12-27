import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NetWorthResponse } from '../../shared/models/net-worth.model';

@Injectable({
  providedIn: 'root'
})
export class NetWorthService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiBaseUrl;

  getNetWorth(): Observable<NetWorthResponse> {
    return this.http.get<NetWorthResponse>(`${this.apiUrl}/net-worth`);
  }
}
