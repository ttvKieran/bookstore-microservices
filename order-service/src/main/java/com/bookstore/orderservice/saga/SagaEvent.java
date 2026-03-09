package com.bookstore.orderservice.saga;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Base event for Saga communication
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SagaEvent {
    
    @JsonProperty("saga_id")
    private String sagaId;
    
    @JsonProperty("order_id")
    private String orderId;
    
    @JsonProperty("event_type")
    private EventType eventType;
    
    @JsonProperty("step")
    private SagaStep step;
    
    @JsonProperty("status")
    private EventStatus status;
    
    @JsonProperty("payload")
    private Object payload;
    
    @JsonProperty("error_message")
    private String errorMessage;
    
    @JsonProperty("timestamp")
    private Long timestamp;
    
    public enum EventType {
        COMMAND,    // Orchestrator → Participant
        REPLY       // Participant → Orchestrator
    }
    
    public enum EventStatus {
        SUCCESS,
        FAILED
    }
    
    public enum SagaStep {
        BOOK_RESERVE,
        BOOK_RELEASE,          // Compensation for BOOK_RESERVE
        PAYMENT_PROCESS,
        PAYMENT_REFUND,        // Compensation for PAYMENT_PROCESS
        SHIPMENT_SCHEDULE,
        SHIPMENT_CANCEL        // Compensation for SHIPMENT_SCHEDULE
    }
    
    // Nested DTOs for payloads
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BookReservePayload {
        @JsonProperty("customer_id")
        private String customerId;
        
        @JsonProperty("items")
        private List<BookItem> items;
        
        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class BookItem {
            @JsonProperty("book_id")
            private Integer bookId;
            
            @JsonProperty("quantity")
            private Integer quantity;
        }
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentPayload {
        @JsonProperty("customer_id")
        private String customerId;
        
        @JsonProperty("order_id")
        private String orderId;
        
        @JsonProperty("amount")
        private BigDecimal amount;
        
        @JsonProperty("payment_method")
        private String paymentMethod;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ShipmentPayload {
        @JsonProperty("order_id")
        private String orderId;
        
        @JsonProperty("customer_id")
        private String customerId;
        
        @JsonProperty("shipping_address")
        private String shippingAddress;
    }
}
