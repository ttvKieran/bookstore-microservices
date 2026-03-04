package com.bookstore.shipservice.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CreateShipmentRequest {
    private String orderId;
    private String customerId;
    private String shippingAddress;
    private String carrier;
    private LocalDateTime estimatedDelivery;
}
