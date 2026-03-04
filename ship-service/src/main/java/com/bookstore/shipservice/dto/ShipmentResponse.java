package com.bookstore.shipservice.dto;

import com.bookstore.shipservice.model.Shipment;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class ShipmentResponse {
    private UUID id;
    private String orderId;
    private String customerId;
    private String shippingAddress;
    private Shipment.ShipmentStatus status;
    private String trackingNumber;
    private String carrier;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime shippedAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime estimatedDelivery;
    private List<TrackingHistoryDto> trackingHistory;
    
    @Data
    public static class TrackingHistoryDto {
        private UUID id;
        private Shipment.ShipmentStatus status;
        private String location;
        private String notes;
        private LocalDateTime timestamp;
    }
}
