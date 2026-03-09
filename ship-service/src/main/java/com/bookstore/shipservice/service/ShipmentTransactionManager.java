package com.bookstore.shipservice.service;

import com.bookstore.shipservice.dto.PrepareShipmentRequest;
import com.bookstore.shipservice.model.Shipment;
import com.bookstore.shipservice.repository.ShipmentRepository;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class ShipmentTransactionManager {
    
    @Autowired
    private ShipmentRepository shipmentRepository;
    
    // In-memory transaction log (for demo - use Redis/DB in production)
    private final Map<String, TransactionState> transactions = new ConcurrentHashMap<>();
    
    @Data
    @AllArgsConstructor
    public static class TransactionState {
        private String globalTxnId;
        private UUID shipmentId;
        private String status; // PREPARED, COMMITTED, ABORTED
        private LocalDateTime timestamp;
        private PrepareShipmentRequest request;
    }
    
    /**
     * Generate unique transaction ID for shipment service
     */
    public String generateTxnId() {
        return "TXN-SHIP-" + UUID.randomUUID().toString().substring(0, 12);
    }
    
    /**
     * PREPARE phase: Create shipment in PENDING state
     */
    public Map<String, Object> prepareShipment(PrepareShipmentRequest request) {
        log.info("🔄 [2PC PREPARE] Preparing shipment for order: {}", request.getOrderId());
        
        try {
            // Validate request
            if (request.getShippingAddress() == null || request.getShippingAddress().isEmpty()) {
                return createErrorResponse("Shipping address is required");
            }
            
            // Create shipment in PREPARING state
            Shipment shipment = new Shipment();
            shipment.setOrderId(request.getOrderId());  // Already String
            shipment.setCustomerId(request.getCustomerId());  // Already String
            shipment.setShippingAddress(request.getShippingAddress());
            shipment.setStatus(Shipment.ShipmentStatus.PREPARING);
            shipment.setCreatedAt(LocalDateTime.now());
            
            shipment = shipmentRepository.save(shipment);
            
            // Generate local transaction ID
            String txnId = generateTxnId();
            
            // Store transaction state
            TransactionState txnState = new TransactionState(
                request.getTransactionId(),
                shipment.getId(),
                "PREPARED",
                LocalDateTime.now(),
                request
            );
            transactions.put(txnId, txnState);
            
            log.info("✅ [2PC PREPARE] Shipment prepared successfully. TxnId: {}, ShipmentId: {}", 
                txnId, shipment.getId());
            
            Map<String, Object> data = new HashMap<>();
            data.put("shipment_id", shipment.getId());
            data.put("status", shipment.getStatus());
            
            return createSuccessResponse(txnId, "Shipment prepared successfully", data);
            
        } catch (Exception e) {
            log.error("❌ [2PC PREPARE] Failed to prepare shipment: {}", e.getMessage());
            return createErrorResponse("Failed to prepare shipment: " + e.getMessage());
        }
    }
    
    /**
     * COMMIT phase: Update shipment status to CONFIRMED
     */
    public Map<String, Object> commitShipment(String txnId) {
        log.info("🔄 [2PC COMMIT] Committing shipment transaction: {}", txnId);
        
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
            // Update shipment status to READY_TO_SHIP
            Shipment shipment = shipmentRepository.findById(txnState.getShipmentId())
                .orElseThrow(() -> new RuntimeException("Shipment not found: " + txnState.getShipmentId()));
            
            shipment.setStatus(Shipment.ShipmentStatus.READY_TO_SHIP);
            shipment.setUpdatedAt(LocalDateTime.now());
            
            shipmentRepository.save(shipment);
            
            // Update transaction state
            txnState.setStatus("COMMITTED");
            transactions.put(txnId, txnState);
            
            log.info("✅ [2PC COMMIT] Shipment committed successfully. ShipmentId: {}", shipment.getId());
            
            return Map.of(
                "success", true,
                "message", "Shipment committed successfully"
            );
            
        } catch (Exception e) {
            log.error("❌ [2PC COMMIT] Failed to commit shipment: {}", e.getMessage());
            return Map.of(
                "success", false,
                "message", "Failed to commit shipment: " + e.getMessage()
            );
        }
    }
    
    /**
     * ABORT phase: Delete the pending shipment (rollback)
     */
    public Map<String, Object> abortShipment(String txnId) {
        log.info("🔄 [2PC ABORT] Aborting shipment transaction: {}", txnId);
        
        TransactionState txnState = transactions.get(txnId);
        
        if (txnState == null) {
            log.warn("⚠️ [2PC ABORT] Transaction not found (already cleaned up): {}", txnId);
            return Map.of(
                "success", true,
                "message", "Transaction not found (already cleaned up)"
            );
        }
        
        try {
            // Delete the pending shipment
            Shipment shipment = shipmentRepository.findById(txnState.getShipmentId())
                .orElse(null);
            
            if (shipment != null) {
                shipmentRepository.delete(shipment);
                log.info("🔙 [2PC ABORT] Shipment deleted. ShipmentId: {}", shipment.getId());
            }
            
            // Update transaction state
            txnState.setStatus("ABORTED");
            transactions.put(txnId, txnState);
            
            log.info("✅ [2PC ABORT] Shipment aborted successfully");
            
            return Map.of(
                "success", true,
                "message", "Shipment aborted successfully"
            );
            
        } catch (Exception e) {
            log.error("❌ [2PC ABORT] Failed to abort shipment: {}", e.getMessage());
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
