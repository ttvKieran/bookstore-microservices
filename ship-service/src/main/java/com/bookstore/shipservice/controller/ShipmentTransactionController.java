package com.bookstore.shipservice.controller;

import com.bookstore.shipservice.dto.*;
import com.bookstore.shipservice.service.ShipmentTransactionManager;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/transactions")
@Slf4j
public class ShipmentTransactionController {
    
    @Autowired
    private ShipmentTransactionManager transactionManager;
    
    /**
     * PREPARE phase - Create shipment in PENDING state
     */
    @PostMapping("/prepare-shipment")
    public ResponseEntity<Map<String, Object>> prepareShipment(@RequestBody PrepareShipmentRequest request) {
        log.info("📋 [2PC] Received PREPARE request for order: {}", request.getOrderId());
        
        Map<String, Object> response = transactionManager.prepareShipment(request);
        
        Boolean ready = (Boolean) response.get("ready");
        if (Boolean.TRUE.equals(ready)) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * COMMIT phase - Update shipment status to CONFIRMED
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
        
        Map<String, Object> response = transactionManager.commitShipment(request.getTransactionId());
        
        Boolean success = (Boolean) response.get("success");
        if (Boolean.TRUE.equals(success)) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * ABORT phase - Delete pending shipment (rollback)
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
        
        Map<String, Object> response = transactionManager.abortShipment(request.getTransactionId());
        
        return ResponseEntity.ok(response);
    }
}
