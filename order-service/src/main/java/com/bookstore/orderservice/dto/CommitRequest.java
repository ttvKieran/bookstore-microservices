package com.bookstore.orderservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request for COMMIT or ABORT phase
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommitRequest {
    private String transactionId;
    private String action;  // "COMMIT" or "ABORT"
}
