package com.bookstore.payservice.service;

import com.bookstore.payservice.dto.PreparePaymentRequest;
import com.bookstore.payservice.model.Payment;
import com.bookstore.payservice.repository.PaymentRepository;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class PaymentTransactionManager {
    
    @Autowired
    private PaymentRepository paymentRepository;
    
    // In-memory transaction log (for demo - use Redis/DB in production)
    private final Map<String, TransactionState> transactions = new ConcurrentHashMap<>();
    
    @Data
    @AllArgsConstructor
    public static class TransactionState {
        private String globalTxnId;
        private UUID paymentId;
        private String status; // PREPARED, COMMITTED, ABORTED
        private LocalDateTime timestamp;
        private PreparePaymentRequest request;
    }
    
    /**
     * Generate unique transaction ID for payment service
     */
    public String generateTxnId() {
        return "TXN-PAY-" + UUID.randomUUID().toString().substring(0, 12);
    }
    
    /**
     * PREPARE phase: Create payment in PENDING state
     */
    public Map<String, Object> preparePayment(PreparePaymentRequest request) {
        log.info("🔄 [2PC PREPARE] Preparing payment for order: {}", request.getOrderId());
        
        try {
            // Validate request
            if (request.getTotalAmount() == null || request.getTotalAmount() <= 0) {
                return createErrorResponse("Invalid amount: " + request.getTotalAmount());
            }
            
            if (request.getPaymentMethod() == null || request.getPaymentMethod().isEmpty()) {
                return createErrorResponse("Payment method is required");
            }
            
            // Create payment in PENDING state
            Payment payment = new Payment();
            payment.setOrderId(request.getOrderId());  // Already String
            payment.setCustomerId(request.getCustomerId());  // Already String
            payment.setAmount(BigDecimal.valueOf(request.getTotalAmount()));
            
            // Convert payment method string to enum (handle snake_case)
            String paymentMethodStr = request.getPaymentMethod().toUpperCase().replace("-", "_");
            payment.setPaymentMethod(Payment.PaymentMethod.valueOf(paymentMethodStr));
            
            payment.setPaymentDetails(request.getPaymentDetails());
            payment.setStatus(Payment.PaymentStatus.PENDING);
            payment.setCreatedAt(LocalDateTime.now());
            
            payment = paymentRepository.save(payment);
            
            // Generate local transaction ID
            String txnId = generateTxnId();
            
            // Store transaction state
            TransactionState txnState = new TransactionState(
                request.getTransactionId(),
                payment.getId(),
                "PREPARED",
                LocalDateTime.now(),
                request
            );
            transactions.put(txnId, txnState);
            
            log.info("✅ [2PC PREPARE] Payment prepared successfully. TxnId: {}, PaymentId: {}", 
                txnId, payment.getId());
            
            Map<String, Object> data = new HashMap<>();
            data.put("payment_id", payment.getId());
            data.put("amount", payment.getAmount());
            data.put("status", payment.getStatus());
            
            return createSuccessResponse(txnId, "Payment prepared successfully", data);
            
        } catch (Exception e) {
            log.error("❌ [2PC PREPARE] Failed to prepare payment: {}", e.getMessage());
            return createErrorResponse("Failed to prepare payment: " + e.getMessage());
        }
    }
    
    /**
     * COMMIT phase: Update payment status to COMPLETED
     */
    public Map<String, Object> commitPayment(String txnId) {
        log.info("🔄 [2PC COMMIT] Committing payment transaction: {}", txnId);
        
        TransactionState txnState = transactions.get(txnId);
        
        if (txnState == null) {
            log.error("❌ [2PC COMMIT] Transaction not found: {}", txnId);
            return Map.of(
                "success", false,
                "message", "Transaction not found or expired"
            );
        }
        
        if (!"PREPARED".equals(txnState.getStatus())) {
            log.error("❌ [2PC COMMIT] Transaction not in PREPARED state: {}", txnState.getStatus());
            return Map.of(
                "success", false,
                "message", "Transaction not in PREPARED state: " + txnState.getStatus()
            );
        }
        
        try {
            // Update payment status to COMPLETED
            Payment payment = paymentRepository.findById(txnState.getPaymentId())
                .orElseThrow(() -> new RuntimeException("Payment not found: " + txnState.getPaymentId()));
            
            payment.setStatus(Payment.PaymentStatus.COMPLETED);
            payment.setTransactionId(txnState.getGlobalTxnId());
            payment.setUpdatedAt(LocalDateTime.now());
            
            paymentRepository.save(payment);
            
            // Update transaction state
            txnState.setStatus("COMMITTED");
            transactions.put(txnId, txnState);
            
            log.info("✅ [2PC COMMIT] Payment committed successfully. PaymentId: {}", payment.getId());
            
            return Map.of(
                "success", true,
                "message", "Payment committed successfully"
            );
            
        } catch (Exception e) {
            log.error("❌ [2PC COMMIT] Failed to commit payment: {}", e.getMessage());
            return Map.of(
                "success", false,
                "message", "Failed to commit payment: " + e.getMessage()
            );
        }
    }
    
    /**
     * ABORT phase: Delete the pending payment (rollback)
     */
    public Map<String, Object> abortPayment(String txnId) {
        log.info("🔄 [2PC ABORT] Aborting payment transaction: {}", txnId);
        
        TransactionState txnState = transactions.get(txnId);
        
        if (txnState == null) {
            log.warn("⚠️ [2PC ABORT] Transaction not found (already cleaned up): {}", txnId);
            return Map.of(
                "success", true,
                "message", "Transaction not found (already cleaned up)"
            );
        }
        
        try {
            // Delete the pending payment
            Payment payment = paymentRepository.findById(txnState.getPaymentId())
                .orElse(null);
            
            if (payment != null) {
                paymentRepository.delete(payment);
                log.info("🔙 [2PC ABORT] Payment deleted. PaymentId: {}", payment.getId());
            }
            
            // Update transaction state
            txnState.setStatus("ABORTED");
            transactions.put(txnId, txnState);
            
            log.info("✅ [2PC ABORT] Payment aborted successfully");
            
            return Map.of(
                "success", true,
                "message", "Payment aborted successfully"
            );
            
        } catch (Exception e) {
            log.error("❌ [2PC ABORT] Failed to abort payment: {}", e.getMessage());
            return Map.of(
                "success", true, // Return success even if cleanup fails
                "message", "Abort completed with warnings: " + e.getMessage()
            );
        }
    }
    
    // Helper methods
    
    private Map<String, Object> createSuccessResponse(String txnId, String message, Object data) {
        Map<String, Object> response = new HashMap<>();
        response.put("ready", true);
        response.put("transaction_id", txnId);
        response.put("message", message);
        response.put("data", data);
        return response;
    }
    
    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("ready", false);
        response.put("transaction_id", null);
        response.put("message", message);
        return response;
    }
}
