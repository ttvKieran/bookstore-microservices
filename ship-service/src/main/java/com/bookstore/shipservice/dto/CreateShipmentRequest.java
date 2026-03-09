package com.bookstore.shipservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateShipmentRequest {
    @JsonProperty("order_id")
    private String orderId;
    
    @JsonProperty("customer_id")
    private String customerId; // Optional - for internal tracking
    
    private String carrier;
    
    @JsonProperty("shipping_address")
    private ShippingAddress shippingAddress;
    
    @JsonProperty("estimated_delivery")
    private LocalDate estimatedDelivery;
}
