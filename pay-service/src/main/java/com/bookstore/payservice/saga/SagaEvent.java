package com.bookstore.payservice.saga;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SagaEvent {
    @JsonProperty("saga_id")
    private String transactionId;
    
    @JsonProperty("order_id")
    private String orderId;
    
    @JsonProperty("event_type")
    private EventType eventType;
    
    @JsonProperty("status")
    private EventStatus eventStatus;
    
    @JsonProperty("step")
    private SagaStep sagaStep;
    
    @JsonProperty("payload")
    private Object payload;
    
    @JsonProperty("error_message")
    private String errorMessage;
    
    public enum EventType {
        COMMAND,
        REPLY
    }
    
    public enum EventStatus {
        SUCCESS,
        FAILED
    }
    
    public enum SagaStep {
        BOOK_RESERVE,
        BOOK_RELEASE,
        PAYMENT_PROCESS,
        PAYMENT_REFUND,
        SHIPMENT_SCHEDULE,
        SHIPMENT_CANCEL
    }
    
    // Payment-specific payload DTOs
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentPayload {
        private String orderId;
        private String customerId;
        private BigDecimal amount;
        private String paymentMethod;
        private String paymentId; // For compensation
    }
}
