package com.bookstore.shipservice.dto;

import com.bookstore.shipservice.model.Shipment;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class ShipmentResponse {
    @JsonProperty("shipment_id")
    private UUID id;
    
    @JsonProperty("order_id")
    private String orderId;
    
    @JsonProperty("tracking_number")
    private String trackingNumber;
    
    private String carrier;
    
    @JsonProperty("shipping_status")
    private Shipment.ShipmentStatus status;
    
    @JsonProperty("shipping_address")
    private String shippingAddress;
    
    @JsonProperty("estimated_delivery")
    private LocalDate estimatedDelivery;
    
    @JsonProperty("actual_delivery")
    private LocalDate actualDelivery;
    
    @JsonProperty("created_at")
    private LocalDateTime createdAt;
    
    private List<TrackingHistoryDto> history;
    
    @Data
    public static class TrackingHistoryDto {
        private Shipment.ShipmentStatus status;
        private String location;
        private LocalDateTime timestamp;
    }
}
