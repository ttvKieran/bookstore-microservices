package com.bookstore.payservice.controller;

import com.bookstore.payservice.dto.*;
import com.bookstore.payservice.service.PaymentTransactionManager;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/transactions")
@Slf4j
public class PaymentTransactionController {
    
    @Autowired
    private PaymentTransactionManager transactionManager;
    
    /**
     * PREPARE phase - Create payment in PENDING state
     */
    @PostMapping("/prepare-payment")
    public ResponseEntity<Map<String, Object>> preparePayment(@RequestBody PreparePaymentRequest request) {
        log.info("📋 [2PC] Received PREPARE request for order: {}", request.getOrderId());
        
        Map<String, Object> response = transactionManager.preparePayment(request);
        
        Boolean ready = (Boolean) response.get("ready");
        if (Boolean.TRUE.equals(ready)) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * COMMIT phase - Update payment status to COMPLETED
     */
    @PostMapping("/commit")
    public ResponseEntity<Map<String, Object>> commitTransaction(@RequestBody CommitAbortRequest request) {
        log.info("📋 [2PC] Received COMMIT request. TxnId: {}", request.getTransactionId());
        
        if (!"COMMIT".equals(request.getAction())) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Invalid action: " + request.getAction() + ". Expected: COMMIT"
            ));
        }
        
        Map<String, Object> response = transactionManager.commitPayment(request.getTransactionId());
        
        Boolean success = (Boolean) response.get("success");
        if (Boolean.TRUE.equals(success)) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * ABORT phase - Delete pending payment (rollback)
     */
    @PostMapping("/abort")
    public ResponseEntity<Map<String, Object>> abortTransaction(@RequestBody CommitAbortRequest request) {
        log.info("📋 [2PC] Received ABORT request. TxnId: {}", request.getTransactionId());
        
        if (!"ABORT".equals(request.getAction())) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Invalid action: " + request.getAction() + ". Expected: ABORT"
            ));
        }
        
        Map<String, Object> response = transactionManager.abortPayment(request.getTransactionId());
        
        return ResponseEntity.ok(response);
    }
}
