package com.bezkoder.springjwt.repository;

import com.bezkoder.springjwt.models.Customer;
import com.bezkoder.springjwt.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    Optional<Customer> findByEmail(String email);

    public Page<Customer> findByUser(User user, PageRequest of);

    public Optional<Customer> findByEmailAndUser(String email, User user);

    public Optional<Customer> findByIdAndUser(Long id, User user);
    
}
