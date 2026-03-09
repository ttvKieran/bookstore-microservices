package com.bookstore.payservice.dto;

import com.bookstore.payservice.model.Payment;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class ProcessPaymentRequest {
    private Payment.PaymentStatus status;
    
    @JsonProperty("transaction_id")
    private String transactionId;
}
