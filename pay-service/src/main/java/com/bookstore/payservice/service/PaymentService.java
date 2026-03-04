package com.bookstore.payservice.service;

import com.bookstore.payservice.dto.CreatePaymentRequest;
import com.bookstore.payservice.dto.PaymentResponse;
import com.bookstore.payservice.dto.ProcessPaymentRequest;
import com.bookstore.payservice.model.Payment;
import com.bookstore.payservice.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentService {
    
    private final PaymentRepository paymentRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    
    @Value("${order.service.url}")
    private String orderServiceUrl;
    
    @Transactional
    public PaymentResponse createPayment(CreatePaymentRequest request) {
        // Check if payment already exists for this order
        Optional<Payment> existingPayment = paymentRepository.findByOrderId(request.getOrderId());
        if (existingPayment.isPresent()) {
            throw new RuntimeException("Payment already exists for this order");
        }
        
        Payment payment = new Payment();
        payment.setOrderId(request.getOrderId());
        payment.setCustomerId(request.getCustomerId());
        payment.setAmount(request.getAmount());
        payment.setPaymentMethod(request.getPaymentMethod());
        payment.setPaymentDetails(request.getPaymentDetails());
        payment.setStatus(Payment.PaymentStatus.PENDING);
        
        Payment savedPayment = paymentRepository.save(payment);
        return convertToResponse(savedPayment);
    }
    
    @Transactional
    public PaymentResponse processPayment(UUID paymentId, ProcessPaymentRequest request) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));
        
        if (payment.getStatus() != Payment.PaymentStatus.PENDING) {
            throw new RuntimeException("Payment already processed");
        }
        
        payment.setStatus(request.getStatus());
        payment.setTransactionId(request.getTransactionId());
        payment.setProcessedAt(LocalDateTime.now());
        
        Payment updatedPayment = paymentRepository.save(payment);
        
        // Notify order-service if payment is completed
        if (request.getStatus() == Payment.PaymentStatus.COMPLETED) {
            notifyOrderService(payment.getOrderId(), payment.getId().toString());
        }
        
        return convertToResponse(updatedPayment);
    }
    
    public PaymentResponse getPaymentById(UUID paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));
        return convertToResponse(payment);
    }
    
    public PaymentResponse getPaymentByOrderId(String orderId) {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Payment not found for order"));
        return convertToResponse(payment);
    }
    
    public List<PaymentResponse> getPaymentsByCustomer(String customerId) {
        List<Payment> payments = paymentRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
        return payments.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    public List<PaymentResponse> getPaymentsByStatus(Payment.PaymentStatus status) {
        List<Payment> payments = paymentRepository.findByStatusOrderByCreatedAtDesc(status);
        return payments.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    @Transactional
    public PaymentResponse refundPayment(UUID paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));
        
        if (payment.getStatus() != Payment.PaymentStatus.COMPLETED) {
            throw new RuntimeException("Can only refund completed payments");
        }
        
        payment.setStatus(Payment.PaymentStatus.REFUNDED);
        Payment updatedPayment = paymentRepository.save(payment);
        
        return convertToResponse(updatedPayment);
    }
    
    public Map<String, Object> getPaymentStatistics() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("total_payments", paymentRepository.count());
        stats.put("pending_payments", paymentRepository.countByStatus(Payment.PaymentStatus.PENDING));
        stats.put("completed_payments", paymentRepository.countByStatus(Payment.PaymentStatus.COMPLETED));
        stats.put("failed_payments", paymentRepository.countByStatus(Payment.PaymentStatus.FAILED));
        stats.put("refunded_payments", paymentRepository.countByStatus(Payment.PaymentStatus.REFUNDED));
        return stats;
    }
    
    private void notifyOrderService(String orderId, String paymentId) {
        try {
            String url = orderServiceUrl + "/orders/" + orderId + "/status";
            Map<String, Object> request = new HashMap<>();
            request.put("status", "PAID");
            request.put("paymentId", paymentId);
            restTemplate.put(url, request);
        } catch (Exception e) {
            // Log error but don't fail payment
            System.err.println("Failed to notify order service: " + e.getMessage());
        }
    }
    
    private PaymentResponse convertToResponse(Payment payment) {
        PaymentResponse response = new PaymentResponse();
        response.setId(payment.getId());
        response.setOrderId(payment.getOrderId());
        response.setCustomerId(payment.getCustomerId());
        response.setAmount(payment.getAmount());
        response.setPaymentMethod(payment.getPaymentMethod());
        response.setStatus(payment.getStatus());
        response.setTransactionId(payment.getTransactionId());
        response.setPaymentDetails(payment.getPaymentDetails());
        response.setCreatedAt(payment.getCreatedAt());
        response.setUpdatedAt(payment.getUpdatedAt());
        response.setProcessedAt(payment.getProcessedAt());
        return response;
    }
}
