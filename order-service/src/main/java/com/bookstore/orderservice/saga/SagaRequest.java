package com.bookstore.orderservice.saga;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * Request DTO for Saga Order Creation
 * Same structure as TwoPhaseCommitRequest for consistency
 */
@Data
public class SagaRequest {
    @JsonProperty("customer_id")
    private String customerId;
    
    @JsonProperty("shipping_address_id")
    private String shippingAddress;
    
    @JsonProperty("payment_method")
    private String paymentMethod;
}
