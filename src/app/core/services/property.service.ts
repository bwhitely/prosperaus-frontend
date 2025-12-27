import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PropertyRequest,
  PropertyResponse,
  MortgageRequest,
  MortgageResponse
} from '../../shared/models/property.model';

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  private http = inject(HttpClient);
  private propertiesUrl = `${environment.apiBaseUrl}/properties`;
  private mortgagesUrl = `${environment.apiBaseUrl}/mortgages`;

  // Properties
  getProperties(): Observable<PropertyResponse[]> {
    return this.http.get<PropertyResponse[]>(this.propertiesUrl);
  }

  getProperty(id: string): Observable<PropertyResponse> {
    return this.http.get<PropertyResponse>(`${this.propertiesUrl}/${id}`);
  }

  createProperty(property: PropertyRequest): Observable<PropertyResponse> {
    return this.http.post<PropertyResponse>(this.propertiesUrl, property);
  }

  updateProperty(id: string, property: PropertyRequest): Observable<PropertyResponse> {
    return this.http.put<PropertyResponse>(`${this.propertiesUrl}/${id}`, property);
  }

  deleteProperty(id: string): Observable<void> {
    return this.http.delete<void>(`${this.propertiesUrl}/${id}`);
  }

  // Mortgages
  getMortgagesForProperty(propertyId: string): Observable<MortgageResponse[]> {
    return this.http.get<MortgageResponse[]>(`${this.mortgagesUrl}/property/${propertyId}`);
  }

  createMortgage(mortgage: MortgageRequest): Observable<MortgageResponse> {
    return this.http.post<MortgageResponse>(this.mortgagesUrl, mortgage);
  }

  updateMortgage(id: string, mortgage: MortgageRequest): Observable<MortgageResponse> {
    return this.http.put<MortgageResponse>(`${this.mortgagesUrl}/${id}`, mortgage);
  }

  deleteMortgage(id: string): Observable<void> {
    return this.http.delete<void>(`${this.mortgagesUrl}/${id}`);
  }
}
