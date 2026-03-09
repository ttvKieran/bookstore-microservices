package com.bookstore.orderservice.saga;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Represents the state of a Saga instance
 * Tracks progress through the distributed transaction
 */
@Data
public class SagaState {
    private String sagaId;
    private String orderId;
    private String customerId;
    private SagaStatus status;
    private SagaEvent.SagaStep currentStep;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String errorMessage;
    
    // Step completion flags
    private boolean bookReserved = false;
    private boolean paymentProcessed = false;
    private boolean shipmentScheduled = false;
    
    // IDs for compensation
    private String paymentId;  // For payment refund
    private String shipmentId; // For shipment cancellation
    
    public enum SagaStatus {
        STARTED,
        BOOK_RESERVING,
        BOOK_RESERVED,
        PAYMENT_PROCESSING,
        PAYMENT_PROCESSED,
        SHIPMENT_SCHEDULING,
        SHIPMENT_SCHEDULED,
        COMPLETED,
        COMPENSATING,
        COMPENSATED,
        FAILED
    }
    
    public SagaState() {
        this.sagaId = UUID.randomUUID().toString();
        this.status = SagaStatus.STARTED;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    public void updateStatus(SagaStatus newStatus) {
        this.status = newStatus;
        this.updatedAt = LocalDateTime.now();
    }
}
