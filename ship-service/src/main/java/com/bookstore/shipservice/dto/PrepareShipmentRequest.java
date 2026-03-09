package com.bookstore.shipservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PrepareShipmentRequest {
    
    @JsonProperty("transaction_id")
    private String transactionId;
    
    @JsonProperty("order_id")
    private String orderId;
    
    @JsonProperty("customer_id")
    private String customerId;
    
    @JsonProperty("shipping_address")
    private String shippingAddress;
}
