import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {
      // Check if the user is authenticated
      const isLoggedIn = localStorage.getItem('access_token') !== null;

      // Get the path from the route config
      const path = route.routeConfig?.path;
      console.log(path);

      // If the user is logged in and trying to access the login page, redirect them to /customers
      if (isLoggedIn && path === 'login') {
        this.router.navigate(['/customers']);
        return false;  // Prevent navigation to login page
      }

      // If the user is not logged in and trying to access the customers page, redirect them to login
      if (!isLoggedIn && path === 'customers') {
        this.router.navigate(['/login']);
        return false;  // Prevent navigation to customers page
      }

      // Allow normal navigation
      return true;
  }
}
