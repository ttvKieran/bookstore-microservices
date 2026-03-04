package com.bookstore.shipservice.service;

import com.bookstore.shipservice.dto.CreateShipmentRequest;
import com.bookstore.shipservice.dto.ShipmentResponse;
import com.bookstore.shipservice.dto.UpdateShipmentRequest;
import com.bookstore.shipservice.model.Shipment;
import com.bookstore.shipservice.model.ShipmentTracking;
import com.bookstore.shipservice.repository.ShipmentRepository;
import com.bookstore.shipservice.repository.ShipmentTrackingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShipmentService {
    
    private final ShipmentRepository shipmentRepository;
    private final ShipmentTrackingRepository trackingRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    
    @Value("${order.service.url}")
    private String orderServiceUrl;
    
    @Transactional
    public ShipmentResponse createShipment(CreateShipmentRequest request) {
        // Check if shipment already exists for this order
        Optional<Shipment> existingShipment = shipmentRepository.findByOrderId(request.getOrderId());
        if (existingShipment.isPresent()) {
            throw new RuntimeException("Shipment already exists for this order");
        }
        
        Shipment shipment = new Shipment();
        shipment.setOrderId(request.getOrderId());
        shipment.setCustomerId(request.getCustomerId());
        shipment.setShippingAddress(request.getShippingAddress());
        shipment.setCarrier(request.getCarrier());
        shipment.setEstimatedDelivery(request.getEstimatedDelivery());
        shipment.setStatus(Shipment.ShipmentStatus.PREPARING);
        shipment.setTrackingNumber(generateTrackingNumber());
        
        Shipment savedShipment = shipmentRepository.save(shipment);
        
        // Add initial tracking entry
        addTrackingEntry(savedShipment, Shipment.ShipmentStatus.PREPARING, 
                "Warehouse", "Order received and being prepared");
        
        return convertToResponse(savedShipment);
    }
    
    @Transactional
    public ShipmentResponse updateShipmentStatus(UUID shipmentId, UpdateShipmentRequest request) {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new RuntimeException("Shipment not found"));
        
        shipment.setStatus(request.getStatus());
        
        // Update timestamps based on status
        if (request.getStatus() == Shipment.ShipmentStatus.SHIPPED) {
            shipment.setShippedAt(LocalDateTime.now());
        } else if (request.getStatus() == Shipment.ShipmentStatus.DELIVERED) {
            shipment.setDeliveredAt(LocalDateTime.now());
        }
        
        Shipment updatedShipment = shipmentRepository.save(shipment);
        
        // Add tracking entry
        addTrackingEntry(updatedShipment, request.getStatus(), 
                request.getLocation(), request.getNotes());
        
        // Notify order-service if delivered
        if (request.getStatus() == Shipment.ShipmentStatus.DELIVERED) {
            notifyOrderService(shipment.getOrderId(), shipment.getId().toString());
        }
        
        return convertToResponse(updatedShipment);
    }
    
    public ShipmentResponse getShipmentById(UUID shipmentId) {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new RuntimeException("Shipment not found"));
        return convertToResponse(shipment);
    }
    
    public ShipmentResponse getShipmentByOrderId(String orderId) {
        Shipment shipment = shipmentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Shipment not found for order"));
        return convertToResponse(shipment);
    }
    
    public ShipmentResponse trackShipment(String trackingNumber) {
        Shipment shipment = shipmentRepository.findByTrackingNumber(trackingNumber)
                .orElseThrow(() -> new RuntimeException("Shipment not found"));
        return convertToResponse(shipment);
    }
    
    public List<ShipmentResponse> getShipmentsByCustomer(String customerId) {
        List<Shipment> shipments = shipmentRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
        return shipments.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    public List<ShipmentResponse> getShipmentsByStatus(Shipment.ShipmentStatus status) {
        List<Shipment> shipments = shipmentRepository.findByStatusOrderByCreatedAtDesc(status);
        return shipments.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    public Map<String, Object> getShipmentStatistics() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("total_shipments", shipmentRepository.count());
        stats.put("preparing_shipments", shipmentRepository.countByStatus(Shipment.ShipmentStatus.PREPARING));
        stats.put("shipped_shipments", shipmentRepository.countByStatus(Shipment.ShipmentStatus.SHIPPED));
        stats.put("in_transit_shipments", shipmentRepository.countByStatus(Shipment.ShipmentStatus.IN_TRANSIT));
        stats.put("delivered_shipments", shipmentRepository.countByStatus(Shipment.ShipmentStatus.DELIVERED));
        return stats;
    }
    
    private void addTrackingEntry(Shipment shipment, Shipment.ShipmentStatus status, 
                                   String location, String notes) {
        ShipmentTracking tracking = new ShipmentTracking();
        tracking.setShipment(shipment);
        tracking.setStatus(status);
        tracking.setLocation(location);
        tracking.setNotes(notes);
        trackingRepository.save(tracking);
    }
    
    private String generateTrackingNumber() {
        return "TRK" + UUID.randomUUID().toString().substring(0, 13).toUpperCase();
    }
    
    private void notifyOrderService(String orderId, String shipmentId) {
        try {
            String url = orderServiceUrl + "/orders/" + orderId + "/status";
            Map<String, Object> request = new HashMap<>();
            request.put("status", "DELIVERED");
            request.put("shipmentId", shipmentId);
            restTemplate.put(url, request);
        } catch (Exception e) {
            // Log error but don't fail shipment update
            System.err.println("Failed to notify order service: " + e.getMessage());
        }
    }
    
    private ShipmentResponse convertToResponse(Shipment shipment) {
        ShipmentResponse response = new ShipmentResponse();
        response.setId(shipment.getId());
        response.setOrderId(shipment.getOrderId());
        response.setCustomerId(shipment.getCustomerId());
        response.setShippingAddress(shipment.getShippingAddress());
        response.setStatus(shipment.getStatus());
        response.setTrackingNumber(shipment.getTrackingNumber());
        response.setCarrier(shipment.getCarrier());
        response.setCreatedAt(shipment.getCreatedAt());
        response.setUpdatedAt(shipment.getUpdatedAt());
        response.setShippedAt(shipment.getShippedAt());
        response.setDeliveredAt(shipment.getDeliveredAt());
        response.setEstimatedDelivery(shipment.getEstimatedDelivery());
        
        // Get tracking history
        List<ShipmentTracking> tracking = trackingRepository.findByShipmentIdOrderByTimestampDesc(shipment.getId());
        List<ShipmentResponse.TrackingHistoryDto> history = tracking.stream()
                .map(this::convertTrackingToDto)
                .collect(Collectors.toList());
        response.setTrackingHistory(history);
        
        return response;
    }
    
    private ShipmentResponse.TrackingHistoryDto convertTrackingToDto(ShipmentTracking tracking) {
        ShipmentResponse.TrackingHistoryDto dto = new ShipmentResponse.TrackingHistoryDto();
        dto.setId(tracking.getId());
        dto.setStatus(tracking.getStatus());
        dto.setLocation(tracking.getLocation());
        dto.setNotes(tracking.getNotes());
        dto.setTimestamp(tracking.getTimestamp());
        return dto;
    }
}
