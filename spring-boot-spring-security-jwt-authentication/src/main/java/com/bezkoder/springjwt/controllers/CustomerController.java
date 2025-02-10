package com.bezkoder.springjwt.controllers;

import com.bezkoder.springjwt.models.Customer;
import com.bezkoder.springjwt.models.CustomerCreateDTO;
import com.bezkoder.springjwt.models.User;
import com.bezkoder.springjwt.repository.CustomerRepository;
import com.bezkoder.springjwt.repository.UserRepository;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/customers")
@CrossOrigin(origins = "*", allowedHeaders = "*")
@SecurityRequirement(name = "bearerAuth")
public class CustomerController {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private UserRepository userRepository;

    private User getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // Get all customers for the authenticated user with pagination
    @GetMapping
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<?> getCustomers(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int per_page) {

        User user = getAuthenticatedUser();
        Page<Customer> customers = customerRepository.findByUser(user, PageRequest.of(page - 1, per_page));

        Map<String, Object> response = new HashMap<>();
        response.put("status", true);
        response.put("message", "Customers retrieved successfully");
        response.put("data", customers.getContent());
        response.put("paging", Map.of(
                "page", customers.getNumber() + 1, // Adjust for 0-based index
                "per_page", customers.getSize(),
                "total_pages", customers.getTotalPages(),
                "total_items", customers.getTotalElements()
        ));

        return ResponseEntity.ok(response);
    }

    // Create a new customer for the authenticated user
    @PostMapping
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<?> createCustomer(@Valid @RequestBody CustomerCreateDTO customerDTO) {
        User user = getAuthenticatedUser();

        if (customerRepository.findByEmailAndUser(customerDTO.getEmail(), user).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", false,
                    "message", "Email must be unique for this user"
            ));
        }

        Customer customer = new Customer(customerDTO.getName(), customerDTO.getEmail());
        customer.setUser(user);
        Customer savedCustomer = customerRepository.save(customer);

        return ResponseEntity.status(201).body(Map.of(
                "status", true,
                "message", "Customer created successfully",
                "data", savedCustomer
        ));
    }

    // Get a single customer by ID (only if it belongs to the authenticated user)
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<?> getCustomer(@PathVariable Long id) {
        User user = getAuthenticatedUser();
        Optional<Customer> customer = customerRepository.findByIdAndUser(id, user);

        if (customer.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of(
                    "status", false,
                    "message", "Customer not found"
            ));
        }

        return ResponseEntity.ok(Map.of(
                "status", true,
                "message", "Customer found successfully",
                "data", customer.get()
        ));
    }

    // Update a customer (only if it belongs to the authenticated user)
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<?> updateCustomer(
            @PathVariable Long id,
            @Valid @RequestBody Customer customerDetails) {
        User user = getAuthenticatedUser();
        Optional<Customer> customer = customerRepository.findByIdAndUser(id, user);

        if (customer.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of(
                    "status", false,
                    "message", "Customer not found"
            ));
        }

        Optional<Customer> existingCustomer = customerRepository.findByEmailAndUser(customerDetails.getEmail(), user);
        if (existingCustomer.isPresent() && !existingCustomer.get().getId().equals(id)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", false,
                    "message", "Email must be unique for this user"
            ));
        }

        Customer updatedCustomer = customer.get();
        updatedCustomer.setName(customerDetails.getName());
        updatedCustomer.setEmail(customerDetails.getEmail());
        customerRepository.save(updatedCustomer);

        return ResponseEntity.ok(Map.of(
                "status", true,
                "message", "Customer updated successfully",
                "data", updatedCustomer
        ));
    }

    // Delete a customer (only if it belongs to the authenticated user)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<?> deleteCustomer(@PathVariable Long id) {
        User user = getAuthenticatedUser();
        Optional<Customer> customer = customerRepository.findByIdAndUser(id, user);

        if (customer.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of(
                    "status", false,
                    "message", "Customer not found"
            ));
        }

        customerRepository.delete(customer.get());
        return ResponseEntity.status(204).body(Map.of(
                "status", true,
                "message", "Customer deleted successfully"
        ));
    }
}
