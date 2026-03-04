package com.bookstore.payservice.dto;

import com.bookstore.payservice.model.Payment;
import lombok.Data;

@Data
public class ProcessPaymentRequest {
    private Payment.PaymentStatus status;
    private String transactionId;
}
