import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CashAccountRequest, CashAccountResponse, CashAccountsByType,
  LiabilityRequest, LiabilityResponse, LiabilitiesByType,
  HecsPayoffProjection
} from '../../shared/models/cash-liability.model';

@Injectable({
  providedIn: 'root'
})
export class CashLiabilityService {
  private http = inject(HttpClient);
  private cashUrl = `${environment.apiBaseUrl}/cash-accounts`;
  private liabilityUrl = `${environment.apiBaseUrl}/liabilities`;

  // Cash Accounts
  getCashAccounts(): Observable<CashAccountResponse[]> {
    return this.http.get<CashAccountResponse[]>(this.cashUrl);
  }

  createCashAccount(request: CashAccountRequest): Observable<CashAccountResponse> {
    return this.http.post<CashAccountResponse>(this.cashUrl, request);
  }

  updateCashAccount(id: string, request: CashAccountRequest): Observable<CashAccountResponse> {
    return this.http.put<CashAccountResponse>(`${this.cashUrl}/${id}`, request);
  }

  deleteCashAccount(id: string): Observable<void> {
    return this.http.delete<void>(`${this.cashUrl}/${id}`);
  }

  // Liabilities
  getLiabilities(): Observable<LiabilityResponse[]> {
    return this.http.get<LiabilityResponse[]>(this.liabilityUrl);
  }

  createLiability(request: LiabilityRequest): Observable<LiabilityResponse> {
    return this.http.post<LiabilityResponse>(this.liabilityUrl, request);
  }

  updateLiability(id: string, request: LiabilityRequest): Observable<LiabilityResponse> {
    return this.http.put<LiabilityResponse>(`${this.liabilityUrl}/${id}`, request);
  }

  deleteLiability(id: string): Observable<void> {
    return this.http.delete<void>(`${this.liabilityUrl}/${id}`);
  }

  /**
   * Get HECS/HELP payoff projection for a liability.
   * Includes year-by-year breakdown with CPI indexation.
   *
   * @param liabilityId Liability ID (must be a HECS/HELP debt)
   * @param cpiRate Optional CPI rate assumption (defaults to 3%)
   * @returns Payoff projection with estimated payoff date and yearly breakdown
   */
  getHecsPayoffProjection(liabilityId: string, cpiRate: number = 0.03): Observable<HecsPayoffProjection> {
    return this.http.get<HecsPayoffProjection>(
      `${this.liabilityUrl}/${liabilityId}/hecs-payoff-projection`,
      { params: { cpiRate: cpiRate.toString() } }
    );
  }

  // Helper methods for grouping
  getCashAccountsByType(): Observable<CashAccountsByType> {
    return this.getCashAccounts().pipe(
      map(accounts => ({
        transaction: accounts.filter(a => a.accountType === 'transaction'),
        savings: accounts.filter(a => a.accountType === 'savings'),
        termDeposits: accounts.filter(a => a.accountType === 'term_deposit'),
        offset: accounts.filter(a => a.accountType === 'offset'),
        other: accounts.filter(a => a.accountType === 'other')
      }))
    );
  }

  getLiabilitiesByType(): Observable<LiabilitiesByType> {
    return this.getLiabilities().pipe(
      map(liabilities => ({
        creditCards: liabilities.filter(l => l.liabilityType === 'credit_card'),
        personalLoans: liabilities.filter(l => l.liabilityType === 'personal_loan'),
        carLoans: liabilities.filter(l => l.liabilityType === 'car_loan'),
        hecsHelp: liabilities.filter(l => l.liabilityType === 'hecs_help'),
        marginLoans: liabilities.filter(l => l.liabilityType === 'margin_loan'),
        other: liabilities.filter(l => l.liabilityType === 'other')
      }))
    );
  }

  // Calculate totals
  getTotalCashBalance(): Observable<number> {
    return this.getCashAccounts().pipe(
      map(accounts => accounts.reduce((sum, a) => sum + a.balance, 0))
    );
  }

  getTotalLiabilities(): Observable<number> {
    return this.getLiabilities().pipe(
      map(liabilities => liabilities.reduce((sum, l) => sum + l.balance, 0))
    );
  }

  getTotalCreditCardDebt(): Observable<number> {
    return this.getLiabilities().pipe(
      map(liabilities =>
        liabilities
          .filter(l => l.liabilityType === 'credit_card')
          .reduce((sum, l) => sum + l.balance, 0)
      )
    );
  }
}
