package com.bookstore.payservice.dto;

import com.bookstore.payservice.model.Payment;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreatePaymentRequest {
    @JsonProperty("order_id")
    private String orderId;
    
    @JsonProperty("customer_id")
    private String customerId;
    
    private BigDecimal amount;
    
    @JsonProperty("payment_method")
    private Payment.PaymentMethod paymentMethod;
    
    @JsonProperty("payment_details")
    private PaymentDetails paymentDetails;
}
