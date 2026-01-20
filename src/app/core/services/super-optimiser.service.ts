import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  SuperOptimisationRequest,
  SuperOptimisationResponse,
  SuperOptimisationPrefillData
} from '../../shared/models/super-optimisation.model';

@Injectable({
  providedIn: 'root'
})
export class SuperOptimiserService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiBaseUrl;

  /**
   * Analyze super contributions and get optimisation recommendations.
   */
  analyse(request: SuperOptimisationRequest): Observable<SuperOptimisationResponse> {
    return this.http.post<SuperOptimisationResponse>(
      `${this.apiUrl}/super/optimise`,
      request
    );
  }

  /**
   * Get prefill data from user's existing profile and assets.
   */
  getPrefillData(): Observable<SuperOptimisationPrefillData> {
    return this.http.get<SuperOptimisationPrefillData>(
      `${this.apiUrl}/super/optimise/prefill`
    );
  }
}
