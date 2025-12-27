import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ScenarioRequest, ScenarioResponse } from '../../shared/models/scenario.model';

@Injectable({
  providedIn: 'root'
})
export class ScenarioService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/scenarios`;

  getAll(): Observable<ScenarioResponse[]> {
    return this.http.get<ScenarioResponse[]>(this.apiUrl);
  }

  getByType(type: string): Observable<ScenarioResponse[]> {
    return this.http.get<ScenarioResponse[]>(`${this.apiUrl}?type=${type}`);
  }

  getById(id: string): Observable<ScenarioResponse> {
    return this.http.get<ScenarioResponse>(`${this.apiUrl}/${id}`);
  }

  create(request: ScenarioRequest): Observable<ScenarioResponse> {
    return this.http.post<ScenarioResponse>(this.apiUrl, request);
  }

  update(id: string, request: ScenarioRequest): Observable<ScenarioResponse> {
    return this.http.put<ScenarioResponse>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleFavourite(id: string): Observable<ScenarioResponse> {
    return this.http.post<ScenarioResponse>(`${this.apiUrl}/${id}/favourite`, {});
  }
}
