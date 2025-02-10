import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Customer } from '../models/customer.model';
import { GLOBALS } from '../globals';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private apiUrl = GLOBALS.apiBaseUrl+'/customers';
  private logoutUrl = GLOBALS.apiBaseUrl + '/auth/logout';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    console.log(token);
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

/*
  getCustomers(): Observable<any> {
    return this.http.get<any>(this.apiUrl, { headers: this.getAuthHeaders() }).pipe(
      tap(response => this.showMessage(response.message)),
      catchError(error => this.handleError(error))
    );
  }
*/

  getCustomers(page: number = 1, pageSize: number = 5): Observable<any> {
    const url = `${this.apiUrl}?page=${page}&per_page=${pageSize}`;
    return this.http.get<any>(url, { headers: this.getAuthHeaders() }).pipe(
      tap(response => this.showMessage(response.message)),
      catchError(error => this.handleError(error))
    );
  }

  addCustomer(customer: Customer): Observable<any> {
    return this.http.post<any>(this.apiUrl, customer, { headers: this.getAuthHeaders() }).pipe(
      tap(response => this.showMessage(response.message)),
      catchError(error => this.handleError(error))
    );
  }

  updateCustomer(id: number, customer: Customer): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, customer, { headers: this.getAuthHeaders() }).pipe(
      tap(response => this.showMessage(response.message)),
      catchError(error => this.handleError(error))
    );
  }

  deleteCustomer(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  logout(): Observable<any> {
    return this.http.post<any>(this.logoutUrl, { headers: this.getAuthHeaders() }).pipe(
      tap(response => this.showMessage(response.message)),
      catchError(error => this.handleError(error))
    );
  }

  
  private showMessage(message: string): void {
    console.log(message); // Handle success message here
  }

  private handleError(error: any): Observable<never> {
    const errorMessage = error.error?.message || 'An unexpected error occurred';
    console.error('API Error:', errorMessage);
    return throwError(() => errorMessage); // Pass the error message to the component
  }
}
