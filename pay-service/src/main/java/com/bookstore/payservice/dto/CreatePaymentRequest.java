package com.bookstore.payservice.dto;

import com.bookstore.payservice.model.Payment;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreatePaymentRequest {
    private String orderId;
    private String customerId;
    private BigDecimal amount;
    private Payment.PaymentMethod paymentMethod;
    private String paymentDetails;
}
