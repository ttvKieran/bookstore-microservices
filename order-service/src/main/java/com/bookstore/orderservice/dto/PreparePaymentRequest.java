package com.bookstore.orderservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PreparePaymentRequest {
    
    @JsonProperty("transaction_id")
    private String transactionId;
    
    @JsonProperty("order_id")
    private String orderId;
    
    @JsonProperty("customer_id")
    private String customerId;
    
    @JsonProperty("total_amount")
    private BigDecimal totalAmount;
    
    @JsonProperty("payment_method")
    private String paymentMethod;
}
