package com.bookstore.shipservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TransactionResponse {
    
    @JsonProperty("ready")
    private Boolean ready;
    
    @JsonProperty("transaction_id")
    private String transactionId;
    
    @JsonProperty("message")
    private String message;
    
    @JsonProperty("data")
    private Object data;
    
    public TransactionResponse(Boolean ready, String transactionId, String message) {
        this.ready = ready;
        this.transactionId = transactionId;
        this.message = message;
    }
}
