import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { CustomersComponent } from './components/customers/customers.component';
import { AuthGuard } from './auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [AuthGuard] },
  { path: 'customers', component: CustomersComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: 'login' }
];
