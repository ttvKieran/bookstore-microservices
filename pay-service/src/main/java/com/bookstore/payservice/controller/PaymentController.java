package com.bookstore.payservice.controller;

import com.bookstore.payservice.dto.*;
import com.bookstore.payservice.model.Payment;
import com.bookstore.payservice.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class PaymentController {
    
    private final PaymentService paymentService;
    
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "healthy");
        health.put("service", "pay-service");
        health.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(health);
    }
    
    @GetMapping("/metrics")
    public ResponseEntity<Map<String, Object>> metrics() {
        Map<String, Object> metrics = paymentService.getPaymentStatistics();
        metrics.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(metrics);
    }
    
    @PostMapping("/payments")
    public ResponseEntity<PaymentResponse> createPayment(@RequestBody CreatePaymentRequest request) {
        try {
            PaymentResponse payment = paymentService.createPayment(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(payment);
        } catch (Exception e) {
            throw new RuntimeException("Failed to create payment: " + e.getMessage());
        }
    }
    
    @GetMapping("/payments/{paymentId}")
    public ResponseEntity<PaymentResponse> getPayment(@PathVariable UUID paymentId) {
        try {
            PaymentResponse payment = paymentService.getPaymentById(paymentId);
            return ResponseEntity.ok(payment);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/payments/order/{order_id}")
    public ResponseEntity<PaymentResponse> getPaymentByOrder(@PathVariable("order_id") String orderId) {
        try {
            PaymentResponse payment = paymentService.getPaymentByOrderId(orderId);
            return ResponseEntity.ok(payment);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/payments/customer/{customer_id}")
    public ResponseEntity<Map<String, Object>> getCustomerPayments(
            @PathVariable("customer_id") String customerId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {
        List<PaymentResponse> payments = paymentService.getPaymentsByCustomer(customerId);
        Map<String, Object> response = new HashMap<>();
        response.put("customer_id", customerId);
        response.put("total", payments.size());
        response.put("payments", payments);
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/payments")
    public ResponseEntity<Map<String, Object>> getPayments(@RequestParam(required = false) String status) {
        List<PaymentResponse> payments;
        
        if (status != null) {
            Payment.PaymentStatus paymentStatus = Payment.PaymentStatus.valueOf(status.toUpperCase());
            payments = paymentService.getPaymentsByStatus(paymentStatus);
        } else {
            payments = paymentService.getPaymentsByStatus(null);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("total", payments.size());
        response.put("payments", payments);
        return ResponseEntity.ok(response);
    }
    
    @PutMapping("/payments/{paymentId}/process")
    public ResponseEntity<PaymentResponse> processPayment(
            @PathVariable UUID paymentId,
            @RequestBody ProcessPaymentRequest request) {
        try {
            PaymentResponse payment = paymentService.processPayment(paymentId, request);
            return ResponseEntity.ok(payment);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(null);
        }
    }
    
    @PostMapping("/payments/{payment_id}/refund")
    public ResponseEntity<RefundResponse> refundPayment(
            @PathVariable("payment_id") UUID paymentId,
            @RequestBody RefundRequest request) {
        try {
            RefundResponse refund = paymentService.refundPayment(paymentId, request);
            return ResponseEntity.ok(refund);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(null);
        }
    }
}
