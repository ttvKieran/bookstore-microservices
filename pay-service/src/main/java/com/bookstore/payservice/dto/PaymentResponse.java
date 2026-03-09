package com.bookstore.payservice.dto;

import com.bookstore.payservice.model.Payment;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class PaymentResponse {
    @JsonProperty("payment_id")
    private UUID id;
    
    @JsonProperty("order_id")
    private String orderId;
    
    @JsonProperty("customer_id")
    private String customerId;
    
    private BigDecimal amount;
    
    @JsonProperty("payment_method")
    private Payment.PaymentMethod paymentMethod;
    
    @JsonProperty("payment_status")
    private Payment.PaymentStatus status;
    
    @JsonProperty("transaction_id")
    private String transactionId;
    
    @JsonProperty("processed_at")
    private LocalDateTime processedAt;
}
