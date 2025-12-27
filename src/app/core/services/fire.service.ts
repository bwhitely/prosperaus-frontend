import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FireProjectionRequest, FireProjectionResponse, FirePrefillData } from '../../shared/models/fire.model';

@Injectable({
  providedIn: 'root'
})
export class FireService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/fire`;

  calculate(request: FireProjectionRequest): Observable<FireProjectionResponse> {
    return this.http.post<FireProjectionResponse>(`${this.apiUrl}/calculate`, request);
  }

  getPrefillData(): Observable<FirePrefillData> {
    return this.http.get<FirePrefillData>(`${this.apiUrl}/prefill`);
  }
}
