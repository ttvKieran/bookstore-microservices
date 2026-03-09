package com.bookstore.orderservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PrepareStockRequest {
    
    @JsonProperty("transaction_id")
    private String transactionId;
    
    @JsonProperty("book_id")
    private Long bookId;
    
    @JsonProperty("quantity")
    private Integer quantity;
}
