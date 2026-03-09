package com.bookstore.orderservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PrepareCartClearRequest {
    
    @JsonProperty("transaction_id")
    private String transactionId;
    
    @JsonProperty("customer_id")
    private String customerId;
}
