import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { GLOBALS } from '../globals';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  errorMessage: string = '';

  constructor(private http: HttpClient, private router: Router) {}

  onLogin(): void {
    const payload = {
      email: this.email,
      password: this.password
    };

    this.http.post<any>(GLOBALS.apiBaseUrl + '/auth/login', payload).subscribe({
      next: (response) => {
        // Store the token in localStorage depends if Java or Flask backend
        if ( response?.data?.token !== undefined) 
          localStorage.setItem('access_token', response.data.token);
        if ( response?.accessToken !== undefined) 
          localStorage.setItem('access_token', response.accessToken);
        // Redirect to customers page
        this.router.navigate(['/customers']);
      },
      error: (err) => {
        this.errorMessage = err.error.message || 'Invalid credentials';
      }
    });
  }
}
