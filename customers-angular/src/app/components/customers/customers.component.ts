import { Component, OnInit } from '@angular/core';
import { Customer } from '../../models/customer.model';
import { CustomerService } from '../../services/customer.service';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-customers',
  standalone: true,
  templateUrl: './customers.component.html',
  imports: [FormsModule, NgFor, NgIf, NgClass],
  styleUrls: ['./customers.component.css']
})
export class CustomersComponent implements OnInit {
  customers: Customer[] = [];
  customer: Customer = { name: '', email: '' };
  isEditing: boolean = false;
  message: string = ''; // Success or error message
  isError: boolean = false; // Flag to differentiate between success and error messages
  deleteCustomerId: number | null = null;
  currentPage: number = 1;
  pageSize: number = 5;
  totalPages: number = 1;

  constructor(private customerService: CustomerService, private router: Router) {}

  ngOnInit(): void {
    this.loadCustomers();
  }

  changePage(page: number): void {
    console.log(page, this.totalPages);
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadCustomers();
    }
  }

  getPages(): number[] {  
    return Array.from({ length: this.totalPages }, (_, i) => 1+i);
  }

  loadCustomers(): void {
    this.customerService.getCustomers(this.currentPage, this.pageSize).subscribe({
      next: response => {
        this.customers = response.data;
        this.totalPages = response.paging.total_pages;
        console.log();
      },
      error: err => {
        this.showMessage(err, true); // Display error message
      }
    });
  }


  saveCustomer(): void {
    const serviceCall = this.isEditing
      ? this.customerService.updateCustomer(this.customer.id!, this.customer)
      : this.customerService.addCustomer(this.customer);

    serviceCall.subscribe({
      next: response => {
        this.loadCustomers();
        this.resetForm();
        this.showMessage(response.message, false); // Display success message
      },
      error: err => {
        this.showMessage(err, true); // Display error message
      }
    });
  }

  openDeleteModal(id: number): void {
    this.deleteCustomerId = id;
  }

  confirmDelete(): void {
    if (this.deleteCustomerId !== null) {
      this.customerService.deleteCustomer(this.deleteCustomerId).subscribe(() => {
        this.loadCustomers();
        this.message = 'Customer deleted successfully!';
        this.deleteCustomerId = null;
      });
    }
  }  

  editCustomer(cust: Customer): void {
    this.customer = { ...cust };
    this.isEditing = true;
  }

  resetForm(): void {
    this.customer = { name: '', email: '' };
    this.isEditing = false;
  }

  logout(): void {
    this.customerService.logout().subscribe({
      next: (response) => {
        localStorage.removeItem('access_token');
        this.router.navigate(['/login']);
      },
      error: err => {
        this.showMessage(err, true);
      }
    });
  }

  private showMessage(msg: string, isError: boolean): void {
    this.message = msg;
    this.isError = isError;

  // After 5 seconds, hide the message
  setTimeout(() => {
    this.message = '';  // Clear the message after 5 seconds
  }, 5000);
  }
  
}
