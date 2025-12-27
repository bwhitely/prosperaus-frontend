import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ExpenseCategoryRequest,
  ExpenseCategoryResponse,
  UserExpenseRequest,
  UserExpenseResponse
} from '../../shared/models/cash-flow.model';

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;

  // Category methods

  getCategories(): Observable<ExpenseCategoryResponse[]> {
    return this.http.get<ExpenseCategoryResponse[]>(`${this.baseUrl}/expense-categories`);
  }

  getUserCategories(): Observable<ExpenseCategoryResponse[]> {
    return this.http.get<ExpenseCategoryResponse[]>(`${this.baseUrl}/expense-categories/user`);
  }

  getCategoryById(id: string): Observable<ExpenseCategoryResponse> {
    return this.http.get<ExpenseCategoryResponse>(`${this.baseUrl}/expense-categories/${id}`);
  }

  createCategory(request: ExpenseCategoryRequest): Observable<ExpenseCategoryResponse> {
    return this.http.post<ExpenseCategoryResponse>(`${this.baseUrl}/expense-categories`, request);
  }

  updateCategory(id: string, request: ExpenseCategoryRequest): Observable<ExpenseCategoryResponse> {
    return this.http.put<ExpenseCategoryResponse>(`${this.baseUrl}/expense-categories/${id}`, request);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/expense-categories/${id}`);
  }

  // Expense methods

  getExpenses(): Observable<UserExpenseResponse[]> {
    return this.http.get<UserExpenseResponse[]>(`${this.baseUrl}/expenses`);
  }

  getExpensesByCategory(categoryId: string): Observable<UserExpenseResponse[]> {
    return this.http.get<UserExpenseResponse[]>(`${this.baseUrl}/expenses/category/${categoryId}`);
  }

  getExpenseById(id: string): Observable<UserExpenseResponse> {
    return this.http.get<UserExpenseResponse>(`${this.baseUrl}/expenses/${id}`);
  }

  createExpense(request: UserExpenseRequest): Observable<UserExpenseResponse> {
    return this.http.post<UserExpenseResponse>(`${this.baseUrl}/expenses`, request);
  }

  updateExpense(id: string, request: UserExpenseRequest): Observable<UserExpenseResponse> {
    return this.http.put<UserExpenseResponse>(`${this.baseUrl}/expenses/${id}`, request);
  }

  deleteExpense(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/expenses/${id}`);
  }
}
