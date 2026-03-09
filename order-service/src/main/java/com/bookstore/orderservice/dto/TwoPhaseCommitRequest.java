package com.bookstore.orderservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.Map;

/**
 * Request DTO for Two-Phase Commit Order Creation
 */
@Data
public class TwoPhaseCommitRequest {
    @JsonProperty("customer_id")
    private String customerId;
    
    @JsonProperty("shipping_address_id")
    private String shippingAddress;
    
    @JsonProperty("payment_method")
    private String paymentMethod;
    
    @JsonProperty("payment_details")
    private Map<String, String> paymentDetails;
}
