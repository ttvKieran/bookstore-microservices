package com.bookstore.payservice.repository;

import com.bookstore.payservice.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByOrderId(String orderId);
    List<Payment> findByCustomerIdOrderByCreatedAtDesc(String customerId);
    List<Payment> findByStatusOrderByCreatedAtDesc(Payment.PaymentStatus status);
    Long countByStatus(Payment.PaymentStatus status);
}
