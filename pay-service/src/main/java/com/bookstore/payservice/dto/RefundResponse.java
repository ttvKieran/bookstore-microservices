package com.bookstore.payservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class RefundResponse {
    @JsonProperty("refund_id")
    private UUID refundId;
    
    @JsonProperty("payment_id")
    private UUID paymentId;
    
    private BigDecimal amount;
    
    @JsonProperty("refund_status")
    private String refundStatus;
    
    @JsonProperty("processed_at")
    private LocalDateTime processedAt;
}
