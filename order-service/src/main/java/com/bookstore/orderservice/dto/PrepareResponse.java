package com.bookstore.orderservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response from participants in PREPARE phase
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PrepareResponse {
    private boolean ready;           // true = READY, false = ABORT
    private String transactionId;     // Transaction ID for this operation
    private String message;           // Status message
    private Object data;              // Additional data if needed
}
